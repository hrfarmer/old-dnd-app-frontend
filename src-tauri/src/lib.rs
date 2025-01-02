use std::collections::HashMap;

use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use http::Request;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, Wry};
use tauri_plugin_store::StoreExt;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_tungstenite::{tungstenite::Message, MaybeTlsStream, WebSocketStream};

#[derive(Serialize, Deserialize)]
pub struct UserSession {
    access_token: String,
    refresh_token: String,
    session: DiscordUser,
}

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
    accent_color: Option<i32>,
}

#[tauri::command]
async fn exit_app(app: tauri::AppHandle) {
    app.exit(1);
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
async fn get_session(token: &str) -> Result<String, &str> {
    let client = reqwest::Client::new();
    let resp = client
        .get("http://localhost:8080/session")
        .header(reqwest::header::AUTHORIZATION, token)
        .send()
        .await;
    match resp {
        Ok(r) => match r.status() {
            StatusCode::OK => Ok(r.text().await.unwrap()),
            _ => Err("Status code not okay"),
        },
        Err(_) => Err("Request failed"),
    }
}

#[tauri::command]
async fn ws_login(app: tauri::AppHandle) -> Result<bool, String> {
    match tokio_tungstenite::connect_async("ws://localhost:8080/ws-login").await {
        Ok((stream, _)) => {
            let (_, mut read) = stream.split();
            let mut idx = 0;

            while let Some(message) = read.next().await {
                match message {
                    Ok(msg) => {
                        if idx == 0 {
                            let _ = app.emit("open_login_url", msg.to_string());
                            idx += 1;
                        } else if idx == 1 {
                            let _ = app.emit("session", msg.to_string());
                            break;
                        }
                    }
                    Err(e) => eprintln!("Error receiving message: {}", e),
                }
            }

            Ok(true)
        }
        Err(a) => {
            println!("{a:?}");
            Err(String::from("Failed to connect to login websocket"))
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
    let args: Vec<String> = std::env::args().collect();
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_websocket::init())
        .setup(move |app| {
            dbg!(&args);
            if args.len() > 1 && args[1] == "reset" {
                let store = app.store("store.json")?;
                store.clear();
            }
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            exit_app,
            check_token_valid,
            connect,
            disconnect,
            send_message,
            ws_login,
            get_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
