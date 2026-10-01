use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    SingleChoice,
    #[serde(rename = "multiple_choice", alias = "multi_choice")]
    MultiChoice,
    TrueFalse,
    FillBlank,
    ShortAnswer,
}

impl fmt::Display for QuestionType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            QuestionType::SingleChoice => write!(f, "single_choice"),
            QuestionType::MultiChoice => write!(f, "multiple_choice"),
            QuestionType::TrueFalse => write!(f, "true_false"),
            QuestionType::FillBlank => write!(f, "fill_blank"),
            QuestionType::ShortAnswer => write!(f, "short_answer"),
        }
    }
}

impl QuestionType {
    pub fn to_label_cn(&self) -> &'static str {
        match self {
            QuestionType::SingleChoice => "单选题",
            QuestionType::MultiChoice => "多选题",
            QuestionType::TrueFalse => "判断题",
            QuestionType::FillBlank => "填空题",
            QuestionType::ShortAnswer => "简答题",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

impl fmt::Display for Difficulty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Difficulty::Easy => write!(f, "easy"),
            Difficulty::Medium => write!(f, "medium"),
            Difficulty::Hard => write!(f, "hard"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { #[serde(default = "plain_format")] format: String, content: String },
    Image { content: String },
}
fn plain_format() -> String { "plain".into() }
impl ContentBlock {
    pub fn text(content: String) -> Self { Self::Text { format: plain_format(), content } }
    pub fn as_text(&self) -> String {
        match self { Self::Text { content, .. } => content.clone(), Self::Image { .. } => "[Image]".into() }
    }
    fn validate(&self) -> Result<(), String> {
        match self {
            Self::Text { format, .. } if format == "plain" || format == "html" => Ok(()),
            Self::Image { content } => {
                let (prefix, bytes) = content.split_once(',').ok_or("Invalid image data URL")?;
                if !["data:image/png;base64", "data:image/jpeg;base64", "data:image/gif;base64", "data:image/webp;base64", "data:image/bmp;base64"].contains(&prefix) || bytes.is_empty() { return Err("Images must be embedded base64 raster images".into()); }
                use base64::Engine;
                base64::engine::general_purpose::STANDARD.decode(bytes).map_err(|_| "Invalid base64 image".to_string())?;
                Ok(())
            },
            _ => Err("Unsupported text format".into()),
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption { pub id: String, pub content: ContentBlock }
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QuestionExplanation {
    #[serde(default)] pub general: Vec<ContentBlock>,
    #[serde(default, rename = "byOptionId")] pub by_option_id: std::collections::BTreeMap<String, Vec<ContentBlock>>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CorrectAnswer { Ids(Vec<String>), Text(String) }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(try_from = "QuestionInput")]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")] pub qtype: QuestionType,
    #[serde(rename = "questionHeader")] pub question_header: Vec<ContentBlock>,
    pub options: Vec<QuestionOption>,
    #[serde(rename = "correctAnswer")] pub correct_answer: Option<CorrectAnswer>,
    pub explanation: QuestionExplanation,
    #[serde(rename = "aiAnalysis", skip_serializing_if = "Option::is_none")] pub ai_analysis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")] pub subject: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub chapter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub difficulty: Option<Difficulty>,
}
#[derive(Deserialize)]
struct QuestionInput {
    id: String,
    #[serde(rename = "type")] qtype: QuestionType,
    #[serde(default, rename = "questionHeader")] question_header: Option<Vec<ContentBlock>>,
    #[serde(default)] options: Vec<serde_json::Value>,
    #[serde(default, rename = "correctAnswer")] correct_answer: Option<CorrectAnswer>,
    #[serde(default)] explanation: QuestionExplanation,
    #[serde(default)] stem: String,
    #[serde(default)] answer: String,
    #[serde(default)] analysis: String,
    #[serde(default, rename = "aiAnalysis")] ai_analysis: Option<String>,
    #[serde(default)] score: Option<f64>,
    #[serde(default)] subject: Option<String>,
    #[serde(default, deserialize_with = "deserialize_chapter")] chapter: Option<String>,
    #[serde(default)] difficulty: Option<Difficulty>,
}
impl TryFrom<QuestionInput> for Question {
    type Error = String;
    fn try_from(raw: QuestionInput) -> Result<Self, String> {
        let legacy = raw.question_header.is_none();
        let options: Vec<QuestionOption> = raw.options.into_iter().enumerate().map(|(i, value)| {
            if legacy && value.is_string() { Ok(QuestionOption { id: ((b'a' + i as u8) as char).to_string(), content: ContentBlock::text(value.as_str().unwrap().into()) }) }
            else { serde_json::from_value(value).map_err(|e| e.to_string()) }
        }).collect::<Result<_, _>>()?;
        let choice = matches!(raw.qtype, QuestionType::SingleChoice | QuestionType::MultiChoice);
        let answer = if legacy {
            if raw.answer.trim().is_empty() { None }
            else if choice {
                let mut ids: Vec<String> = raw.answer.to_uppercase().chars().filter(|c| c.is_ascii_uppercase()).filter_map(|c| options.get(c as usize - 'A' as usize).map(|o| o.id.clone())).collect();
                ids.sort(); ids.dedup();
                if ids.is_empty() { None } else { Some(CorrectAnswer::Ids(ids)) }
            } else { Some(CorrectAnswer::Text(raw.answer)) }
        } else { raw.correct_answer };
        let explanation = if legacy { QuestionExplanation { general: if raw.analysis.is_empty() { vec![] } else { vec![ContentBlock::text(raw.analysis)] }, ..Default::default() } } else { raw.explanation };
        let q = Self { id: raw.id, qtype: raw.qtype, question_header: raw.question_header.unwrap_or_else(|| vec![ContentBlock::text(raw.stem)]), options, correct_answer: answer, explanation, ai_analysis: raw.ai_analysis, score: raw.score, subject: raw.subject, chapter: raw.chapter, difficulty: raw.difficulty };
        if q.id.trim().is_empty() || q.question_header.is_empty() { return Err("Question needs an ID and header".into()); }
        let ids: std::collections::HashSet<&String> = q.options.iter().map(|o| &o.id).collect();
        if ids.len() != q.options.len() || ids.iter().any(|id| id.trim().is_empty()) { return Err("Option IDs must be nonempty and unique".into()); }
        if choice && q.options.len() < 2 { return Err("Choice questions need at least two options".into()); }
        match &q.correct_answer {
            Some(CorrectAnswer::Ids(answer)) if !choice || answer.is_empty() || answer.iter().any(|id| !ids.contains(id)) || answer.iter().collect::<std::collections::HashSet<_>>().len() != answer.len() || (q.qtype == QuestionType::SingleChoice && answer.len() != 1) => return Err("Invalid correctAnswer option IDs".into()),
            Some(CorrectAnswer::Text(_)) if choice => return Err("Choice answers must be option ID arrays".into()),
            _ => {},
        }
        for id in q.explanation.by_option_id.keys() { if !ids.contains(id) { return Err("Unknown explanation option ID".into()); } }
        for b in q.question_header.iter().chain(q.options.iter().map(|o| &o.content)).chain(q.explanation.general.iter()).chain(q.explanation.by_option_id.values().flatten()) { b.validate()?; }
        Ok(q)
    }
}
impl Question {
    pub fn stem_text(&self) -> String { self.question_header.iter().map(ContentBlock::as_text).collect::<Vec<_>>().join("\n") }
    pub fn analysis_text(&self) -> String { self.explanation.general.iter().map(ContentBlock::as_text).collect::<Vec<_>>().join("\n") }
    pub fn answer_text(&self) -> String {
        match &self.correct_answer {
            None => String::new(),
            Some(CorrectAnswer::Text(text)) => text.clone(),
            Some(CorrectAnswer::Ids(ids)) => ids.iter().filter_map(|id| self.options.iter().position(|o| &o.id == id).map(|i| ((b'A' + i as u8) as char).to_string())).collect::<Vec<_>>().join(", "),
        }
    }
    pub fn grade(&self, user: Option<&str>) -> Option<bool> {
        let correct = self.correct_answer.as_ref()?;
        if self.qtype == QuestionType::ShortAnswer { return None; }
        let user = user.unwrap_or("").trim();
        if user.is_empty() { return Some(false); }
        match correct {
            CorrectAnswer::Ids(ids) => {
                let selected: Vec<String> = serde_json::from_str(user).unwrap_or_default();
                Some(selected.len() == ids.len() && selected.iter().collect::<std::collections::HashSet<_>>().len() == selected.len() && selected.iter().all(|id| ids.contains(id)))
            },
            CorrectAnswer::Text(text) if self.qtype == QuestionType::TrueFalse => {
                fn tf(s: &str) -> Option<bool> {
                    match s.trim().to_uppercase().as_str() {
                        "A" | "√" | "对" | "正确" | "TRUE" | "T" | "是" | "YES" | "Y" | "1" => Some(true),
                        "B" | "×" | "错" | "错误" | "FALSE" | "F" | "否" | "NO" | "N" | "0" => Some(false),
                        _ => None,
                    }
                }
                Some(tf(user).is_some() && tf(user) == tf(text))
            },
            CorrectAnswer::Text(text) => Some(user.to_lowercase() == text.trim().to_lowercase()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamParams {
    pub question_types: Vec<QuestionType>,
    pub count: u32,
    pub difficulty: Difficulty,
    pub language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic_filter: Option<String>,
    #[serde(default)]
    pub auto_chapter: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chapter_names: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub type_counts: Option<std::collections::HashMap<String, u32>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub batch_index: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub batch_total: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_prompt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

fn deserialize_chapter<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<String>, D::Error> {
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    Ok(value.and_then(|value| value.as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned)))
}
