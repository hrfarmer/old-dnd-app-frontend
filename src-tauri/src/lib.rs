use futures_util::{
    stream::{SplitSink, SplitStream},
    FutureExt, SinkExt, StreamExt,
};
use reqwest::StatusCode;
use serde::Serialize;
use std::{borrow::BorrowMut, sync::Arc};
use tauri::ipc::Channel;
use tauri::Manager;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_tungstenite::{tungstenite::Message, MaybeTlsStream, WebSocketStream};

#[derive(Default)]
struct AppState {
    write: Option<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>,
}

#[derive(Clone, Serialize)]
enum WebsocketEvent<'a> {
    Connected { message: &'a str },
    SendMessage { message: &'a str, author: &'a str },
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_login_url() -> Result<String, String> {
    let resp = reqwest::blocking::get("http://localhost:8080/login-url");
    match resp {
        Ok(resp) => Ok(resp.text().unwrap()),
        Err(_) => Err("Failed to get url".to_string()),
    }
}

#[tauri::command]
async fn check_token_valid(token: &str) -> Result<bool, bool> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://discord.com/api/users/@me")
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await;
    match resp {
        Ok(r) => match r.status() {
            StatusCode::OK => Ok(true),
            _ => Err(false),
        },
        Err(_) => Err(false),
    }
}

async fn read_messages(
    mut read: SplitStream<WebSocketStream<impl AsyncRead + AsyncWrite + Unpin>>,
    app: tauri::AppHandle,
) {
    while let Some(message) = read.next().await {
        match message {
            Ok(msg) => println!("Received a message: {}", msg),
            Err(e) => eprintln!("Error receiving message: {}", e),
        }
    }
}

#[tauri::command]
async fn connect(app: tauri::AppHandle) {
    connect_websocket(app).await
}

async fn connect_websocket(app: tauri::AppHandle) {
    println!("Something happened");
    let (stream, _) = tokio_tungstenite::connect_async("ws://localhost:8080/ws")
        .await
        .expect("Failed to connect");
    let (mut write, mut read) = stream.split();

    let state = app.state::<Mutex<AppState>>();
    let mut state = state.lock().await;
    state.write = Some(write);

    let app_clone = app.clone();
    tokio::spawn(read_messages(read, app_clone));
}

#[tauri::command]
async fn send_message(app: tauri::AppHandle, message: &str) -> Result<bool, bool> {
    let state = app.state::<Mutex<AppState>>();
    let mut state = state.lock().await;
    let unwrapped_write = state.write.as_mut().unwrap();

    match unwrapped_write.send(Message::text(message)).await {
        Ok(_) => Ok(true),
        Err(_) => Err(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_login_url,
            check_token_valid,
            connect,
            send_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
