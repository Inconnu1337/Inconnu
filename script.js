const topPanel = document.getElementById('top-panel');
const bottomPanel = document.getElementById('bottom-panel');
const centerPanel = document.getElementById('center-panel');
const imageOnCursor = document.getElementById('imageOnCursor');
const matrixCanvas = document.getElementById("matrixCanvas");
const ctx = matrixCanvas.getContext("2d");
const parallaxLayer = document.getElementById('parallax-layer');

function resizeCanvas() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight * 0.8;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let targetX = mouseX;
let targetY = mouseY;

let isTooltipVisible = false;
let currentTooltipButton = null;

function updateTooltipPosition(event) {
    if (!isTooltipVisible) return;
    
    const tooltipWidth = imageOnCursor.offsetWidth;
    const tooltipHeight = imageOnCursor.offsetHeight;
    const offset = 15;
    
    let tooltipX = event.clientX + offset;
    let tooltipY = event.clientY + offset;

    if (tooltipX + tooltipWidth > window.innerWidth) {
        tooltipX = event.clientX - tooltipWidth - offset;
    }
    
    if (tooltipY + tooltipHeight > window.innerHeight) {
        tooltipY = event.clientY - tooltipHeight - offset;
    }

    tooltipX = Math.max(5, Math.min(tooltipX, window.innerWidth - tooltipWidth - 5));
    tooltipY = Math.max(5, Math.min(tooltipY, window.innerHeight - tooltipHeight - 5));

    imageOnCursor.style.left = `${tooltipX}px`;
    imageOnCursor.style.top = `${tooltipY}px`;
}

document.addEventListener('mousemove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    updateTooltipPosition(event);
});

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function updateParallax() {
    mouseX = lerp(mouseX, targetX, 0.1);
    mouseY = lerp(mouseY, targetY, 0.1);
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const normX = (mouseX - centerX) / centerX;
    const normY = (mouseY - centerY) / centerY;
    
    const parallaxX = normX * 10;
    const parallaxY = normY * 5;
    const rotationY = normX * 1.5;
    
    topPanel.style.transform = `translateY(0) translateX(${parallaxX}px) rotateY(${rotationY}deg)`;
    bottomPanel.style.transform = `translateY(0) translateX(${parallaxX}px) rotateY(${rotationY}deg)`;
    centerPanel.style.transform = `translateX(${parallaxX}px) rotateY(${rotationY}deg)`;
    
    parallaxLayer.style.transform = `translateX(${parallaxX * 0.1}px) translateY(${parallaxY * 0.1}px)`;
    
    const matrixMoveX = normX * 15;
    const matrixMoveY = normY * 8;
    const matrixRotateY = normX * 3;
    const matrixRotateX = -normY * 1.5;
    
    matrixCanvas.style.transform = `
        translateX(${matrixMoveX}px) 
        translateY(${matrixMoveY}px) 
        rotateY(${matrixRotateY}deg) 
        rotateX(${matrixRotateX}deg)
    `;
    
    requestAnimationFrame(updateParallax);
}
updateParallax();

function isURL(str) {
    return /^(https?:\/\/)/.test(str);
}

function getImagePath(path) {
    return isURL(path) ? path : `./${path}`;
}

function loadButtons() {
	fetch("data/buttons.json")
		.then(response => response.json())
		.then(data => {
			data.forEach((button, index) => {
				const btn = document.createElement("div");
				btn.classList.add("button", "button-hidden");
				btn.style.backgroundImage = `url(${getImagePath(button.icon)})`;
				btn.style.animationDelay = `${2 + index * 0.15}s`;

				// Добавляем обработчик окончания анимации
				btn.addEventListener('animationend', function() {
					btn.classList.remove('button-hidden');
				});

				if (button.url) {
					btn.onclick = () => window.location.href = button.url;
				}
				
				if (button.imageOnCursor) {
					btn.addEventListener('mouseenter', function() {
						// Проверяем, завершена ли анимация
						if (this.classList.contains('button-hidden')) return;
						
						currentTooltipButton = this;
						const img = new Image();
						img.src = getImagePath(button.imageOnCursor);
						
						img.onload = function() {
							if (currentTooltipButton === btn) {
								imageOnCursor.style.width = `${Math.min(this.width, window.innerWidth * 0.9)}px`;
								imageOnCursor.style.height = `${Math.min(this.height, window.innerHeight * 0.9)}px`;
								imageOnCursor.style.backgroundImage = `url(${this.src})`;
								
								imageOnCursor.classList.remove('hide');
								imageOnCursor.classList.add('show');
								
								isTooltipVisible = true;
							}
						};
					});
					
					btn.addEventListener('mouseleave', function() {
						if (currentTooltipButton === btn) {
							imageOnCursor.classList.remove('show');
							imageOnCursor.classList.add('hide');
							isTooltipVisible = false;
							currentTooltipButton = null;
						}
					});
				}

				if (button.panel === "top") {
					topPanel.appendChild(btn);
				} else if (button.panel === "bottom") {
					bottomPanel.appendChild(btn);
				}
			});
		});
}
loadButtons();

const columns = Math.floor(window.innerWidth / 20);
const drops = Array(columns).fill(0);
let words = [];
let activeWord = null;
let wordPos = 0;
let lastWordTime = 0;
let lastWord = "";

fetch("data/list.txt")
    .then(response => response.text())
    .then(text => {
        words = text.split("\n").map(word => word.trim()).filter(Boolean);
    });

function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    
    ctx.globalCompositeOperation = "source-over";
    
    ctx.fillStyle = "#0f0";
    ctx.font = "20px monospace";
    
    if (activeWord) {
        const wordX = Math.floor(Math.random() * (columns - activeWord.length));
        for (let i = 0; i < activeWord.length; i++) {
            ctx.fillText(activeWord[i], (wordX + i) * 20, wordPos * 20);
        }
        wordPos++;
        if (wordPos > matrixCanvas.height / 20) {
            activeWord = null;
        }
    }

    if (Math.random() > 0.99 && !activeWord && (Date.now() - lastWordTime > 5000)) {
        let newWord;
        do {
            newWord = words[Math.floor(Math.random() * words.length)];
        } while (newWord === lastWord);

        activeWord = newWord;
        lastWord = newWord;
        wordPos = 0;
        lastWordTime = Date.now();
    }

    drops.forEach((y, x) => {
        const text = Math.random() > 0.5 ? '1' : '0';
        ctx.fillText(text, x * 20, y * 20);
        
        if (y * 20 > matrixCanvas.height && Math.random() > 0.975) {
            drops[x] = 0;
        }
        drops[x]++;
    });
}

const matrixInterval = setInterval(drawMatrix, 50);

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.dispatchEvent(mouseEvent);
});