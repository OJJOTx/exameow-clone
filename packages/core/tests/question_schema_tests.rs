use exameow_core::exam::Question;
use serde_json::json;

#[test]
fn embedded_question_round_trip_and_grading() {
    let bank: serde_json::Value = serde_json::from_str(include_str!("../../../examples/question-44.json")).unwrap();
    let q: Question = serde_json::from_value(bank["questions"][0].clone()).unwrap();
    assert_eq!(q.grade(Some("[\"c\"]")), Some(true));
    assert_eq!(q.grade(Some("[\"a\"]")), Some(false));
    let serialized = serde_json::to_value(&q).unwrap();
    assert_eq!(serialized, bank["questions"][0]);
    assert!(serialized.get("stem").is_none());
    let mut shuffled = q.clone();
    shuffled.options.reverse();
    assert_eq!(shuffled.grade(Some("[\"c\"]")), Some(true));
    shuffled.correct_answer = None;
    assert_eq!(shuffled.grade(Some("[\"c\"]")), None);
}

#[test]
fn migrates_legacy_and_rejects_invalid_ids() {
    let q: Question = serde_json::from_value(json!({"id":"legacy","type":"multi_choice","stem":"Q","options":["One","Two"],"answer":"AB","analysis":"Why"})).unwrap();
    assert_eq!(q.grade(Some("[\"b\",\"a\"]")), Some(true));
    assert_eq!(q.grade(Some("[\"a\",\"a\"]")), Some(false));
    let mut wire = serde_json::to_value(&q).unwrap();
    assert_eq!(wire["type"], "multiple_choice");
    wire["correctAnswer"] = json!(["missing"]);
    assert!(serde_json::from_value::<Question>(wire).is_err());
}
