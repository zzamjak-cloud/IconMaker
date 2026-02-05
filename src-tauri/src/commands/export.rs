use tauri::command;
use std::fs;

/// SVG 문자열을 PNG로 변환
///
/// # Arguments
/// * `svg_content` - SVG 문자열
/// * `size` - 출력 PNG 크기 (픽셀)
///
/// # Returns
/// PNG 바이트 배열
#[command]
pub async fn svg_to_png(svg_content: String, size: u32) -> Result<Vec<u8>, String> {
    use tiny_skia::Pixmap;
    use usvg::TreeParsing; // TreeParsing trait import

    println!("SVG to PNG conversion started");
    println!("SVG content length: {}", svg_content.len());
    println!("SVG content preview: {}", &svg_content[..svg_content.len().min(500)]);
    println!("Target size: {}", size);

    // 테스트: 간단한 SVG로 렌더링 테스트
    let test_svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#000000"/></svg>"##;
    println!("Testing with simple SVG: {}", test_svg);

    // usvg 옵션 설정
    let opt = usvg::Options::default();

    // 테스트 SVG 파싱
    let test_tree = usvg::Tree::from_data(test_svg.as_bytes(), &opt)
        .map_err(|e| format!("테스트 SVG 파싱 실패: {}", e))?;
    println!("Test SVG parsed successfully");

    // 실제 SVG 파싱
    let tree = usvg::Tree::from_data(svg_content.as_bytes(), &opt)
        .map_err(|e| {
            eprintln!("SVG 파싱 실패: {}", e);
            format!("SVG 파싱 실패: {}", e)
        })?;

    println!("SVG parsed successfully");
    println!("Tree has root: {:?}", tree.root.id);
    println!("Tree root has {} children", tree.root.children.len());

    // 렌더링할 크기 계산
    let size_f32 = size as f32;
    let tree_size = tree.size;

    println!("Tree size - width: {}, height: {}", tree_size.width(), tree_size.height());
    println!("Tree viewBox: {:?}", tree.view_box);

    if tree_size.width() == 0.0 || tree_size.height() == 0.0 {
        return Err("SVG 크기가 0입니다".to_string());
    }

    let scale = size_f32 / tree_size.width().max(tree_size.height());
    println!("Scale factor: {}", scale);

    // Pixmap 생성 (PNG 버퍼)
    let mut pixmap = Pixmap::new(size, size)
        .ok_or_else(|| {
            eprintln!("Pixmap 생성 실패");
            "Pixmap 생성 실패".to_string()
        })?;

    println!("Pixmap created: {}x{}", pixmap.width(), pixmap.height());

    // 배경은 투명으로 유지 (PNG 기본값)
    // pixmap은 이미 투명 배경으로 초기화됨
    println!("Using transparent background");

    // 아이콘을 중앙에 배치하기 위한 변환 계산
    let scaled_width = tree_size.width() * scale;
    let scaled_height = tree_size.height() * scale;
    let offset_x = (size_f32 - scaled_width) / 2.0;
    let offset_y = (size_f32 - scaled_height) / 2.0;

    println!("Scaled dimensions: {}x{}", scaled_width, scaled_height);
    println!("Offset: ({}, {})", offset_x, offset_y);

    // 깨끗한 pixmap에서 테스트 SVG만 렌더링
    println!("Rendering test SVG on clean pixmap...");
    resvg::render(&test_tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());

    // 픽셀 카운트
    let pixels_after_test = pixmap.data()
        .chunks(4)
        .filter(|pixel| pixel[3] > 0)
        .count();
    println!("Pixels after test SVG: {}", pixels_after_test);

    // 실제 SVG 렌더링
    println!("Rendering actual SVG...");
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());

    let pixels_after_actual = pixmap.data()
        .chunks(4)
        .filter(|pixel| pixel[3] > 0)
        .count();
    println!("Pixels after actual SVG: {}", pixels_after_actual);

    println!("All rendering completed");

    // 렌더링 확인: 비어있지 않은 픽셀 수 체크
    let non_transparent_pixels = pixmap.data()
        .chunks(4)
        .filter(|pixel| pixel[3] > 0) // 알파 채널이 0보다 큰 픽셀
        .count();
    println!("Non-transparent pixels: {}", non_transparent_pixels);

    if non_transparent_pixels == 0 {
        eprintln!("WARNING: Rendered image has no visible pixels!");
        return Err("렌더링된 이미지에 픽셀이 없습니다".to_string());
    }

    // PNG 인코딩
    let png_data = pixmap.encode_png()
        .map_err(|e| {
            eprintln!("PNG 인코딩 실패: {}", e);
            format!("PNG 인코딩 실패: {}", e)
        })?;

    println!("PNG encoding completed, data size: {} bytes", png_data.len());

    Ok(png_data)
}

/// 파일 저장
///
/// # Arguments
/// * `file_path` - 저장할 파일 경로
/// * `content` - 파일 내용 (바이트 배열)
#[command]
pub async fn save_icon_file(file_path: String, content: Vec<u8>) -> Result<(), String> {
    use std::fs;

    fs::write(&file_path, content)
        .map_err(|e| format!("파일 저장 실패: {}", e))?;

    Ok(())
}

/// SVG의 currentColor를 지정된 색상으로 변경
///
/// # Arguments
/// * `svg_content` - 원본 SVG 문자열
/// * `new_color` - 새 색상 (hex 형식, 예: "#FF0000")
///
/// # Returns
/// 색상이 변경된 SVG 문자열
#[command]
pub fn change_svg_color(svg_content: String, new_color: String) -> Result<String, String> {
    // currentColor를 새 색상으로 교체 (속성 형식)
    let mut modified = svg_content
        .replace(r#"fill="currentColor""#, &format!(r#"fill="{}""#, new_color))
        .replace(r#"fill='currentColor'"#, &format!(r#"fill='{}'"#, new_color))
        .replace(r#"stroke="currentColor""#, &format!(r#"stroke="{}""#, new_color))
        .replace(r#"stroke='currentColor'"#, &format!(r#"stroke='{}'"#, new_color));

    // style 속성 내의 currentColor도 교체
    // style="fill:currentColor" 또는 style="stroke:currentColor" 형식
    modified = modified
        .replace("fill:currentColor", &format!("fill:{}", new_color))
        .replace("stroke:currentColor", &format!("stroke:{}", new_color));

    // "currentColor" 문자열 자체도 모두 교체 (다른 형식에서 사용될 수 있음)
    modified = modified.replace("currentColor", &new_color);

    Ok(modified)
}

/// 시스템 다운로드 폴더에 Download_Icon 폴더 생성 및 경로 반환
///
/// # Returns
/// Download_Icon 폴더의 절대 경로
#[command]
pub fn setup_default_folder() -> Result<String, String> {
    // 다운로드 폴더 경로 가져오기
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "다운로드 폴더를 찾을 수 없습니다".to_string())?;

    // Download_Icon 폴더 경로
    let icon_folder = download_dir.join("Download_Icon");

    // 폴더가 없으면 생성
    if !icon_folder.exists() {
        fs::create_dir_all(&icon_folder)
            .map_err(|e| format!("폴더 생성 실패: {}", e))?;
        println!("Created Download_Icon folder at: {:?}", icon_folder);
    } else {
        println!("Download_Icon folder already exists at: {:?}", icon_folder);
    }

    // 경로를 문자열로 반환
    icon_folder
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "경로를 문자열로 변환할 수 없습니다".to_string())
}
