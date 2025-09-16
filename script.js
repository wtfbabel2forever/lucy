// script.js - BUILD202509160740B (수정판)
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들 가져오기
    const photoUpload = document.getElementById('photoUpload');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const gradeBadge = document.querySelector('.grade-badge');
    const scoreDisplay = document.querySelector('.score-display');

    // 상태 플래그
    let isCardGenerated = false;
    let isQRGenerated = false;

    // 초기 상태: 사진 없을 때 버튼 비활성화
    processBtn.disabled = true;
    downloadBtn.disabled = true;

    // 사진 업로드 → 캔버스 표시 + 카드 디자인 적용
    photoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('사진 선택됨:', file.name);
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    try {
                        // 상태 초기화
                        isCardGenerated = false;
                        isQRGenerated = false;
                        processBtn.disabled = true; // 분석 전까지 비활성
                        downloadBtn.disabled = true;

                        // 캔버스 초기화
                        canvas.width = 400;
                        canvas.height = 400;
                        
                        // 1. 배경 그리기 (그라데이션)
                        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
                        gradient.addColorStop(0, '#f8f9fa');
                        gradient.addColorStop(1, '#e9ecef');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, 400, 400);
                        
                        // 2. 사진 그리기 (중앙에 배치)
                        const maxWidth = 300;
                        const maxHeight = 300;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > maxWidth) {
                                height = height * (maxWidth / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = width * (maxHeight / height);
                                height = maxHeight;
                            }
                        }
                        
                        const x = (400 - width) / 2;
                        const y = (400 - height) / 2;
                        ctx.drawImage(img, x, y, width, height);
                        
                        // 3. 카드 테두리 그리기
                        ctx.strokeStyle = '#FFD700';
                        ctx.lineWidth = 8;
                        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                        ctx.shadowBlur = 15;
                        ctx.strokeRect(20, 20, 360, 360);
                        ctx.shadowBlur = 0;
                        
                        // 4. Lucy Shot 텍스트 추가 (하단 중앙)
                        ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
                        ctx.font = 'bold 20px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('✨ Lucy Shot ✨', 200, 380);

                        // 5. Lucy 로고 이미지 추가 (우측 상단)
                        const logoImg = new Image();
                        logoImg.onload = function() {
                            const logoWidth = 80;
                            const logoHeight = 80;
                            const logoX = 400 - logoWidth - 20;
                            const logoY = 20;
                            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                            isCardGenerated = true;
                            processBtn.disabled = false; // 로고까지 완료되면 활성화
                        };
                        logoImg.onerror = function() {
                            console.warn('로고 이미지(lucy-logo.png)를 찾을 수 없습니다.');
                            isCardGenerated = true;
                            processBtn.disabled = false;
                        };
                        logoImg.src = 'lucy-logo.png';

                    } catch (error) {
                        console.error('캔버스 그리기 오류:', error);
                        alert('이미지 처리 중 오류가 발생했습니다.');
                    }
                };
                img.onerror = function() {
                    alert('이미지를 불러오는 데 실패했습니다.');
                };
                img.src = event.target.result;
            };
            reader.onerror = function() {
                alert('파일을 읽는 데 실패했습니다.');
            };
            reader.readAsDataURL(file);
        } else {
            processBtn.disabled = true;
            downloadBtn.disabled = true;
        }
    });
    
    // 카드 만들기 버튼 - 자동 점수 분석 + QR 코드 생성
    processBtn.addEventListener('click', function() {
        if (!photoUpload.files[0] || !isCardGenerated) {
            alert('먼저 사진을 선택해주세요!');
            return;
        }

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const analysis = analyzePhotoSimple(imageData);
            
            gradeBadge.textContent = analysis.grade;
            scoreDisplay.textContent = analysis.score;
            
            // QR 코드 생성 (이미 생성된 경우 스킵)
            if (!isQRGenerated) {
                generateAndDrawQRCode(analysis, () => {
                    isQRGenerated = true;
                    downloadBtn.disabled = false; // QR 완료 후에만 저장 활성화
                });
            } else {
                downloadBtn.disabled = false;
            }

            alert(`분석 완료!\n등급: ${analysis.grade}\n점수: ${analysis.score}\n포인트: +${analysis.points} Points\nQR 코드가 생성되었습니다!`);

        } catch (error) {
            console.error('분석 중 오류:', error);
            alert('사진 분석 중 오류가 발생했습니다.');
        }
    });
    
    // 저장하기 버튼
    downloadBtn.addEventListener('click', function() {
        if (!isQRGenerated) {
            alert('먼저 [카드 만들기] 버튼을 눌러 QR 코드를 생성해주세요!');
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'lucy-card-' + Date.now() + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    // 간단한 사진 분석 함수
    function analyzePhotoSimple(imageData) {
        const data = imageData.data;
        let brightness = 0;
        let red = 0, green = 0, blue = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            brightness += (r + g + b) / 3;
            red += r;
            green += g;
            blue += b;
        }
        
        const pixelCount = data.length / 4;
        brightness = brightness / pixelCount;
        red = red / pixelCount;
        green = green / pixelCount;
        blue = blue / pixelCount;
        
        let score = Math.min(100, Math.max(0, 
            (brightness / 255) * 40 + 
            (red > green && red > blue ? 30 : 20) + 
            10
        ));
        
        score = Math.round(score);
        
        let grade = 'D';
        if (score >= 90) grade = 'S';
        else if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        
        const basePoints = {
            'S': 500,
            'A': 300,
            'B': 200,
            'C': 100,
            'D': 50
        };
        const scoreBonus = (score - 60) * 5;
        const points = Math.max(0, basePoints[grade] + scoreBonus);
        
        return {
            id: 'LUCY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            timestamp: new Date().toISOString(),
            score: score,
            grade: grade,
            points: points,
            features: {
                brightness: Math.round((brightness / 255) * 100),
                red: Math.round(red),
                green: Math.round(green),
                blue: Math.round(blue)
            }
        };
    }

    // QR 코드 생성 및 캔버스에 그리기 (콜백 지원)
    function generateAndDrawQRCode(analysisData, callback) {
        const qrData = JSON.stringify({
            id: analysisData.id,
            timestamp: analysisData.timestamp,
            score: analysisData.score,
            grade: analysisData.grade,
            points: analysisData.points
        });

        const qrCanvas = document.createElement('canvas');
        
        QRCode.toCanvas(qrCanvas, qrData, {
            width: 80, // 크기 조정 (100 → 80)
            height: 80,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, (error) => {
            if (error) {
                console.error('QR 코드 생성 오류:', error);
                alert('QR 코드 생성 중 오류가 발생했습니다.');
                if (callback) callback();
                return;
            }
            
            // QR 코드 위치: 좌측 하단 (점수와 겹치지 않도록)
            const qrX = 20;
            const qrY = 400 - 80 - 20; // 300
            
            // QR 영역 지우기 (덮어쓰기 방지)
            ctx.clearRect(qrX - 5, qrY - 5, 90, 90);
            
            // QR 코드 그리기
            ctx.drawImage(qrCanvas, qrX, qrY, 80, 80);
            
            // 테두리
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.strokeRect(qrX, qrY, 80, 80);
            
            if (callback) callback();
        });
    }
});
