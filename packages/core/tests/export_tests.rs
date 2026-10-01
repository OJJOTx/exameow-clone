use exameow_core::exam::Question;
use exameow_core::export::{export_csv, export_xlsx_to_writer};

fn make_questions() -> Vec<Question> {
    serde_json::from_value(serde_json::json!([
        {"id":"q1","type":"single_choice","stem":"What is 2+2?","options":["3","4","5","6"],"answer":"B","analysis":"Basic arithmetic","subject":"计算机","chapter":"第一章","difficulty":"hard"},
        {"id":"q2","type":"true_false","stem":"The sky is blue.","options":["True","False"],"answer":"True","analysis":""}
    ])).unwrap()
}

#[test]
fn test_export_csv() {
    let questions = make_questions();
    let dir = std::env::temp_dir();
    let path = dir.join("test_output.csv");
    let path_str = path.to_str().unwrap();
    export_csv(&questions, path_str).unwrap();

    let content = std::fs::read_to_string(path_str).unwrap();
    assert!(content.contains("题干,题型,选项A,选项B,选项C,选项D,选项E,选项F,选项G,选项H,正确答案,解析,学科,章节,难度"));
    assert!(content.contains("What is 2+2?"));
    assert!(content.contains("单选题"));
    assert!(content.contains("3,4,5,6"));
    assert!(content.contains("The sky is blue."));
    assert!(content.contains("判断题"));
    assert!(content.contains("Basic arithmetic"));
    assert!(content.contains("计算机,第一章,hard"));

    std::fs::remove_file(&path).ok();
}

#[test]
fn test_export_empty_csv() {
    let questions: Vec<Question> = vec![];
    let dir = std::env::temp_dir();
    let path = dir.join("test_empty.csv");
    let path_str = path.to_str().unwrap();
    export_csv(&questions, path_str).unwrap();

    let content = std::fs::read_to_string(path_str).unwrap();
    let lines: Vec<_> = content.lines().collect();
    assert_eq!(lines.len(), 1);
    assert!(lines[0].contains("题干"));
    assert!(lines[0].contains("正确答案"));

    std::fs::remove_file(&path).ok();
}

#[test]
fn test_export_csv_includes_subject_chapter() {
    let questions = make_questions();
    let dir = std::env::temp_dir();
    let path = dir.join("test_subject_chapter.csv");
    let path_str = path.to_str().unwrap();
    export_csv(&questions, path_str).unwrap();

    let content = std::fs::read_to_string(path_str).unwrap();
    assert!(content.contains("解析,学科,章节,难度"));
    assert!(content.contains("计算机,第一章"));

    std::fs::remove_file(&path).ok();
}

#[test]
fn test_export_xlsx_includes_difficulty_value_in_final_column() {
    let data = export_xlsx_to_writer(&make_questions()).unwrap();
    let reader = std::io::Cursor::new(data);
    let mut archive = zip::ZipArchive::new(reader).unwrap();
    let mut sheet = String::new();
    use std::io::Read;
    archive
        .by_name("xl/worksheets/sheet1.xml")
        .unwrap()
        .read_to_string(&mut sheet)
        .unwrap();

    assert!(sheet.contains("r=\"O1\""));
    assert!(sheet.contains("r=\"O2\""));

    let mut shared = String::new();
    archive
        .by_name("xl/sharedStrings.xml")
        .unwrap()
        .read_to_string(&mut shared)
        .unwrap();
    assert!(shared.contains("><t>难度</t>"));
    assert!(shared.contains("><t>hard</t>"));
}
