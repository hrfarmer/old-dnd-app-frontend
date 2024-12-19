use std::collections::HashMap;

use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use http::Request;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_tungstenite::{tungstenite::Message, MaybeTlsStream, WebSocketStream};

#[derive(Deserialize, Serialize, Clone)]
struct ChatMessage {
    author: String,
    content: String,
}

#[derive(Default)]
struct AppState {
    write: Option<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(tag = "type", content = "data")]
enum WebsocketMessage {
    Session(DiscordUser),
    ConnectedUsers(HashMap<String, DiscordUser>),
    Message(ChatMessage),
    Disconnect(String),
}

#[derive(Deserialize, Serialize, Clone)]
struct DiscordUser {
    id: String,
    username: String,
    discriminator: String,
    global_name: Option<String>,
    avatar: Option<String>,
    bot: Option<bool>,
    system: Option<bool>,
    mfa_enabled: Option<bool>,
    banner: Option<String>,
    accent_color: Option<u64>,
    locale: Option<String>,
    verified: Option<bool>,
    email: Option<String>,
    flags: Option<u64>,
    premium_type: Option<u64>,
    public_flags: Option<u64>,
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
            Ok(msg) => {
                let time = chrono::Utc::now().format("%H:%M:%S").to_string();
                if Message::is_ping(&msg) {
                    continue;
                }
                if Message::is_close(&msg) {
                    println!("{msg}");
                    break;
                }

                println!("{time:} msg: {msg:?}");
                let msg: WebsocketMessage = match serde_json::from_str(&msg.to_string()) {
                    Ok(message) => message,
                    Err(e) => {
                        eprintln!("Failed to deserialize WebSocket message: {}", e);
                        continue;
                    }
                };

                match msg {
                    WebsocketMessage::Session(discord_user) => {
                        app.emit("session", discord_user).unwrap();
                    }
                    WebsocketMessage::ConnectedUsers(users) => {
                        app.emit("connected_users", users).unwrap();
                    }
                    WebsocketMessage::Message(message) => {
                        app.emit("message", message).unwrap();
                    }
                    WebsocketMessage::Disconnect(_) => todo!(),
                }
            }
            Err(e) => eprintln!("Error receiving message: {}", e),
        }
    }
}

#[tauri::command]
async fn connect(app: tauri::AppHandle, token: &str) -> Result<bool, bool> {
    match connect_websocket(app, token).await {
        Ok(_) => Ok(true),
        Err(_) => Err(false),
    }
}

async fn connect_websocket(app: tauri::AppHandle, token: &str) -> Result<bool, bool> {
    // Manually make the request so the auth header can be passed in
    // (requires all of these extra headers for some reason)
    let request = Request::builder()
        .uri("ws://localhost:8080/ws")
        .header("sec-websocket-key", "foo")
        .header("host", "localhost:8080")
        .header("connection", "upgrade")
        .header("upgrade", "websocket")
        .header("sec-websocket-version", 13)
        .header("Authorization", format!("Bearer {}", token))
        .body(())
        .unwrap();

    match tokio_tungstenite::connect_async(request).await {
        Ok((stream, _)) => {
            let (write, read) = stream.split();
            let state = app.state::<Mutex<AppState>>();
            let mut state = state.lock().await;
            state.write = Some(write);

            let app_clone = app.clone();
            tokio::spawn(read_messages(read, app_clone));

            Ok(true)
        }
        Err(a) => {
            println!("{a:?}");
            Err(false)
        }
    }
}

#[tauri::command]
async fn send_message(app: tauri::AppHandle, message: &str) -> Result<bool, bool> {
    let state = app.state::<Mutex<AppState>>();
    let mut state = state.lock().await;
    let unwrapped_write = state.write.as_mut().unwrap();

    match unwrapped_write
        .send(Message::text(message.to_string()))
        .await
    {
        Ok(_) => Ok(true),
        Err(_) => Err(false),
    }
}

#[tauri::command]
async fn disconnect(app: tauri::AppHandle) -> Result<bool, bool> {
    let state = app.state::<Mutex<AppState>>();
    let mut state = state.lock().await;
    let unwrapped_write = state.write.as_mut().unwrap();

    match unwrapped_write
        .send(Message::text(
            serde_json::to_string(&WebsocketMessage::Disconnect(
                "User disconnection".to_string(),
            ))
            .unwrap(),
        ))
        .await
    {
        Ok(_) => {
            state.write = None;
            Ok(true)
        }
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
            disconnect,
            send_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
