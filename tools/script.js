document.addEventListener("DOMContentLoaded", function () {
    let hoveredInput = null;
    let cropperInstances = {}; // Stores Cropper instances
    let rotationAngles = {}; // Stores rotation angles
    const originalImages = {}; // To store original uploaded image base64

// Function to load image and store original
function loadImage(event, imgId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const imgElement = document.getElementById(imgId);
        const dataUrl = e.target.result;

        imgElement.src = dataUrl;
        imgElement.style.display = "block";
        lastFocusedImage = imgElement;

        // ✅ Store original image data
        originalImages[imgId] = dataUrl;

        // ✅ Reset previous cropper and rotation
        if (cropperInstances[imgId]) {
            cropperInstances[imgId].destroy();
            cropperInstances[imgId] = null;
        }
        rotationAngles[imgId] = 0;
        imgElement.style.transform = "none";
    };
    reader.readAsDataURL(file);
}

// Function to handle crop button logic (initialize + crop)
function cropImage(imgId) {
    const imgElement = document.getElementById(imgId);
    if (!imgElement) {
        alert("Please upload and select an image before cropping!");
        return;
    }

    // ✅ Check if original image exists
    if (!originalImages[imgId]) {
        alert("Original image not found. Please upload again.");
        return;
    }

    // ✅ Always restore original image before cropping to avoid double crop
    imgElement.src = originalImages[imgId];

    // ✅ First click: Initialize cropper
    if (!cropperInstances[imgId]) {
        cropperInstances[imgId] = new Cropper(imgElement, {
            viewMode: 0, // Full freedom
            autoCrop: true,
            autoCropArea: 0.8,
            aspectRatio: NaN,
            dragMode: 'none',
            movable: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            zoomable: true,
            scalable: false,
            rotatable: false,
            responsive: true,
            background: true,
            guides: true,
            center: true,
            highlight: true,
            ready() {
                console.log("Cropper ready for " + imgId);
            }
        });
        return; // ✅ Exit after enabling cropper
    }

    // ✅ Second click: Apply crop
    const cropper = cropperInstances[imgId];
    const croppedCanvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    if (!croppedCanvas) {
        alert("Cropping failed!");
        return;
    }

    // Set cropped image back to the img element
    const croppedDataUrl = croppedCanvas.toDataURL("image/jpeg");
    imgElement.src = croppedDataUrl;

    // ✅ Optionally update the original if you want to allow next crop on cropped version:
    // originalImages[imgId] = croppedDataUrl;

    // Reset rotation and destroy cropper
    rotationAngles[imgId] = 0;
    imgElement.style.transform = "none";
    cropper.destroy();
    cropperInstances[imgId] = null;
}

    
    function rotateImage(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement || !imgElement.src) return alert("No image selected!");
    
        const img = new Image();
        img.crossOrigin = "anonymous"; // To handle CORS if necessary
    
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
    
            // Swap width and height for 90 or 270 degree rotation
            const angle = (rotationAngles[imgId] || 0) + 90;
            rotationAngles[imgId] = angle % 360;
    
            const radians = angle * Math.PI / 180;
    
            if (rotationAngles[imgId] % 180 === 0) {
                canvas.width = img.width;
                canvas.height = img.height;
            } else {
                canvas.width = img.height;
                canvas.height = img.width;
            }
    
            // Move to center and rotate
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(radians);
    
            // Draw the image offset by half width/height
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
            // Update image source with rotated image data
            imgElement.src = canvas.toDataURL();
    
            // Optional: reset visual rotation to prevent double-rotation via CSS
            imgElement.style.transform = "none";
        };
    
        img.src = imgElement.src;
    }
    

    function resetImage(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement) return;
    
        // ✅ Reset image src and hide
        imgElement.src = "";
        imgElement.style.display = "none";
    
        // ✅ Reset any rotation applied
        imgElement.style.transform = "rotate(0deg)";
    
        // ✅ Destroy cropper if initialized
        if (cropperInstances[imgId]) {
            cropperInstances[imgId].destroy();
            cropperInstances[imgId] = null;
        }
    
        // ✅ Remove stored original image
        if (originalImages[imgId]) {
            delete originalImages[imgId];
        }
    
        // ✅ Reset rotation tracking
        if (rotationAngles[imgId] !== undefined) {
            rotationAngles[imgId] = 0;
        }
    
        console.log(`Image with ID "${imgId}" has been fully reset.`);
    }
    
   
    function saveFull(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement || !imgElement.src || imgElement.src === window.location.href) {
            alert("No image to save!");
            return;
        }
    
        // Load image into canvas for conversion
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
    
        img.crossOrigin = "anonymous"; // Prevent CORS issues if possible
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
    
            const jpegData = canvas.toDataURL("image/jpeg", 0.6); 
    
            // ✅ Generate random number between 1 and 9999
            const randomNum = Math.floor(Math.random() * 9999) + 1;
            const filename = `image${randomNum}.jpeg`;
    
            // Download link setup
            const link = document.createElement("a");
            link.href = jpegData;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = imgElement.src;
    }
    

    function saveIDCopy(frontId, backId) {
        const imgFront = document.getElementById(frontId);
        const imgBack = document.getElementById(backId);
    
        // Check if both images are available
        if ((!imgFront || !imgFront.src || imgFront.src === window.location.href) &&
            (!imgBack || !imgBack.src || imgBack.src === window.location.href)) {
            alert("No ID images to save!");
            return;
        }
    
        // Load both images if available
        const frontSrc = (imgFront && imgFront.src && imgFront.src !== window.location.href) ? imgFront.src : null;
        const backSrc = (imgBack && imgBack.src && imgBack.src !== window.location.href) ? imgBack.src : null;
    
        const frontImg = new Image();
        const backImg = new Image();
    
        // Set crossOrigin to avoid CORS issues
        frontImg.crossOrigin = "anonymous";
        backImg.crossOrigin = "anonymous";
    
        let imagesLoaded = 0;
    
        // Process once both images are loaded
        function checkAndProcessImages() {
            imagesLoaded++;
            const totalImages = (frontSrc ? 1 : 0) + (backSrc ? 1 : 0);
    
            if (imagesLoaded === totalImages) {
                // Set canvas size (A4 ratio)
                const canvasWidth = 2480; // Approx. width in pixels for A4 at 300 DPI
                const canvasHeight = 3508; // Approx. height in pixels for A4 at 300 DPI
    
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
    
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
    
                ctx.fillStyle = "#ffffff"; // White background
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
                const halfHeight = canvasHeight / 2;
    
                // Draw Front Image (top half)
                if (frontSrc) {
                    const frontRatio = Math.min(canvasWidth / frontImg.width, halfHeight / frontImg.height);
                    const frontNewWidth = frontImg.width * frontRatio;
                    const frontNewHeight = frontImg.height * frontRatio;
                    const frontX = (canvasWidth - frontNewWidth) / 2;
                    const frontY = (halfHeight - frontNewHeight) / 2;
    
                    ctx.drawImage(frontImg, frontX, frontY, frontNewWidth, frontNewHeight);
                }
    
                // Draw Back Image (bottom half)
                if (backSrc) {
                    const backRatio = Math.min(canvasWidth / backImg.width, halfHeight / backImg.height);
                    const backNewWidth = backImg.width * backRatio;
                    const backNewHeight = backImg.height * backRatio;
                    const backX = (canvasWidth - backNewWidth) / 2;
                    const backY = halfHeight + (halfHeight - backNewHeight) / 2;
    
                    ctx.drawImage(backImg, backX, backY, backNewWidth, backNewHeight);
                }
    
                // Export as JPEG
                const finalImage = canvas.toDataURL("image/jpeg", 0.6); // High-quality JPEG
    
                // ✅ Generate random number for filename
                const randomNum = Math.floor(Math.random() * 9999) + 1;
                const filename = `image${randomNum}.jpeg`;
    
                // Download link setup
                const link = document.createElement("a");
                link.href = finalImage;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    
        // Load images and trigger processing when done
        if (frontSrc) frontImg.onload = checkAndProcessImages;
        if (backSrc) backImg.onload = checkAndProcessImages;
    
        if (frontSrc) frontImg.src = frontSrc;
        if (backSrc) backImg.src = backSrc;
    }
    
    
    function printFullPage(imageId) {
        let img = document.getElementById(imageId);
        if (!img.src || img.src === window.location.href) {
            alert("Please upload an image first.");
            return;
        }

        let printWindow = window.open("", "", "width=800,height=600");
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Full Page</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                        img { width: 100%; height: auto; max-height: 100vh; object-fit: contain; }
                    }
                </style>
            </head>
            <body>
                <img src="${img.src}">
                <script>
                    window.onload = function() { window.print(); window.onafterprint = window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function printIDCopy(imageId1, imageId2) {
        let img1 = document.getElementById(imageId1);
        let img2 = document.getElementById(imageId2);
    
        let frontSrc = img1 && img1.src ? img1.src : "data:image/png;base64,iVBORw0KGgoAAA...";
        let backSrc = img2 && img2.src ? img2.src : "data:image/png;base64,iVBORw0KGgoAAA...";
    
        let printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print ID Copy</title>
                <style>
                    @media print {
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
                        .print-container {
                            width: 210mm; height: 267mm; /* A4 size */
                            display: flex; flex-direction: column; justify-content: space-between;
                            padding: 10mm; box-sizing: border-box;
                        }
                        .id-row {
                            flex: 1; display: flex; justify-content: center; align-items: center;
                            height: auto; /* Each row takes half of the A4 page */
                        }
                        .id-row img {
                            width: 100%; height: auto; max-height: auto;
                            object-fit: contain; border: 
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <div class="id-row"><img src="${frontSrc}"></div>
                    <div class="id-row"><img src="${backSrc}"></div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.onafterprint = window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function toggleMode() {
        const fullPageContainer = document.querySelector(".full-page-container");
        const idCopyContainer = document.querySelector(".id-copy-container");

        if (fullPageContainer.style.display === "none") {
            fullPageContainer.style.display = "block";
            idCopyContainer.style.display = "none";
        } else {
            fullPageContainer.style.display = "none";
            idCopyContainer.style.display = "block";
        }
    }

    function handleDrop(event, imgId) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgElement = document.getElementById(imgId);
            imgElement.src = e.target.result;
            imgElement.style.display = "block";
            lastFocusedImage = imgElement;

            if (cropperInstances[imgId]) cropperInstances[imgId].destroy();
            cropperInstances[imgId] = new Cropper(imgElement, { aspectRatio: NaN });

            rotationAngles[imgId] = 0;
        };
        reader.readAsDataURL(file);
    }

    function allowDrag(event) {
        event.preventDefault();
    }

    document.querySelectorAll(".canvas-container").forEach(container => {
        container.addEventListener("dragover", allowDrag);
        container.addEventListener("drop", function (event) {
            handleDrop(event, this.querySelector("img").id);
        });
    });


 

    // Track the last hovered file input
    document.querySelectorAll(".canvas-container").forEach((container) => {
        container.addEventListener("mouseover", function () {
            hoveredInput = this.querySelector("input[type='file']");
        });
    });
    
    // Handle pasting an image
    document.addEventListener("paste", function (event) {
        if (!hoveredInput) return;
    
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith("image")) {
                const file = item.getAsFile();
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                hoveredInput.files = dataTransfer.files;
                hoveredInput.dispatchEvent(new Event("change"));
                break;
            }
        }
    });
    
    
 

    window.loadImage = loadImage;
    window.cropImage = cropImage;
    window.rotateImage = rotateImage;
    window.resetImage = resetImage;
    window.saveFull = saveFull;
    window.saveIDCopy = saveIDCopy;
     window.printFullPage = printFullPage;
    window.printIDCopy = printIDCopy;
    window.toggleMode = toggleMode;
    




  

});
