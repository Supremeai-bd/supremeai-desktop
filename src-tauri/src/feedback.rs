// Feedback submission for the in-app product pulse widget.
//
// The widget is a port of the web app's WorkspaceMicroSurvey, but the request is
// made from Rust instead of the WebView:
//   * the user's Supabase access token never leaves the native session
//     (src/auth.rs keeps it out of the WebView), and
//   * the gateway route `POST /api/feedback/ingest` is authenticated, so the
//     call needs that bearer token.
//
// Wire contract (supremeai core/api/routes/feedback.py):
//   { "event_type": "thumbs_up" | "thumbs_down", "payload": { "context": {...} } }
// Valid ratings map onto the thumbs taxonomy; everything the user typed is kept
// in `context` so triage has the full picture.

use serde_json::json;
use std::time::Duration;
use tauri::State;

use crate::auth::{current_access_token, UserSessionState};

const DEFAULT_GATEWAY: &str = "https://supremeai-api-ulw0.onrender.com";
const MAX_SUGGESTION_BYTES: usize = 2_000;
/// Stable sentinel the UI translates into "sign in to send feedback".
const SIGN_IN_REQUIRED: &str = "SIGN_IN_REQUIRED";

fn event_type_for(rating: &str) -> Option<&'static str> {
    match rating {
        "great" | "good" => Some("thumbs_up"),
        "okay" | "needs_work" => Some("thumbs_down"),
        _ => None,
    }
}

fn gateway_base() -> String {
    std::env::var("SUPREMEAI_API_URL")
        .unwrap_or_else(|_| DEFAULT_GATEWAY.to_string())
        .trim()
        .trim_end_matches('/')
        .to_string()
}

#[tauri::command]
pub async fn submit_feedback(
    rating: String,
    suggestion: String,
    language: Option<String>,
    app_version: Option<String>,
    state: State<'_, UserSessionState>,
) -> Result<(), String> {
    let event_type = event_type_for(rating.trim())
        .ok_or_else(|| "Unsupported feedback rating.".to_string())?;

    let suggestion = suggestion.trim().to_string();
    if suggestion.len() > MAX_SUGGESTION_BYTES {
        return Err("Feedback is too long for the desktop form.".to_string());
    }

    // Feedback is linked to the signed-in account, exactly like the web app.
    let token = current_access_token(&state).ok_or_else(|| SIGN_IN_REQUIRED.to_string())?;

    let base = gateway_base();
    if !base.starts_with("https://") {
        return Err("The SupremeAI Gateway endpoint must use HTTPS.".to_string());
    }

    let language = match language.as_deref() {
        Some("bn") => "bn",
        _ => "en",
    };

    let payload = json!({
        "event_type": event_type,
        "payload": {
            "context": {
                "source": "desktop",
                "surface": "supremeai-desktop",
                "rating": rating.trim(),
                "suggestion": suggestion,
                "language": language,
                "app_version": app_version.unwrap_or_default(),
                "platform": std::env::consts::OS,
            }
        }
    });

    let client = reqwest::Client::builder()
        .https_only(true)
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|_| "Could not initialize the secure feedback connection.".to_string())?;

    let response = client
        .post(format!("{base}/api/feedback/ingest"))
        .bearer_auth(token)
        .json(&payload)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "The feedback service timed out. Please try again.".to_string()
            } else {
                "The feedback service could not be reached.".to_string()
            }
        })?;

    let status = response.status();
    if status.is_success() {
        return Ok(());
    }
    if status.as_u16() == 401 || status.as_u16() == 403 {
        // Expired or missing session: let the UI ask the user to sign in again.
        return Err(SIGN_IN_REQUIRED.to_string());
    }
    Err(format!("The feedback service returned HTTP {status}."))
}

#[cfg(test)]
mod tests {
    use super::event_type_for;

    #[test]
    fn ratings_map_onto_the_gateway_thumbs_taxonomy() {
        assert_eq!(event_type_for("great"), Some("thumbs_up"));
        assert_eq!(event_type_for("good"), Some("thumbs_up"));
        assert_eq!(event_type_for("okay"), Some("thumbs_down"));
        assert_eq!(event_type_for("needs_work"), Some("thumbs_down"));
    }

    #[test]
    fn unknown_ratings_are_rejected_instead_of_silently_downgraded() {
        assert_eq!(event_type_for("amazing"), None);
        assert_eq!(event_type_for(""), None);
    }
}
