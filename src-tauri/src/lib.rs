use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};

#[tauri::command]
fn send_smtp_email(
  host: String,
  port: u16,
  username: String,
  password: String,
  from_email: String,
  to_email: String,
  subject: String,
  body: String,
) -> Result<String, String> {
  let email = Message::builder()
    .from(from_email.parse().map_err(|e| format!("Invalid From address: {}", e))?)
    .to(to_email.parse().map_err(|e| format!("Invalid To address: {}", e))?)
    .subject(subject)
    .header(ContentType::TEXT_HTML)
    .body(body)
    .map_err(|e| e.to_string())?;

  let creds = Credentials::new(username, password);

  let mailer_builder = if port == 465 {
    SmtpTransport::relay(&host)
  } else {
    SmtpTransport::starttls_relay(&host)
  };

  let mailer = mailer_builder
    .map_err(|e| e.to_string())?
    .port(port)
    .credentials(creds)
    .build();

  match mailer.send(&email) {
    Ok(_) => Ok("OK".to_string()),
    Err(e) => Err(format!("Failed to send email: {}", e)),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![send_smtp_email])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
