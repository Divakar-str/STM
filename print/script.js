document.addEventListener("DOMContentLoaded", function () {
    let hoveredInput = null;
    let cropperInstances = {}; // Stores Cropper instances
    let rotationAngles = {}; // Stores rotation angles

    function loadImage(event, imgId) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgElement = document.getElementById(imgId);
            imgElement.src = e.target.result;
            imgElement.style.display = "block";
            lastFocusedImage = imgElement;

            if (cropperInstances[imgId]) {
                cropperInstances[imgId].destroy();
            }

            cropperInstances[imgId] = new Cropper(imgElement, {
                aspectRatio: NaN,
                viewMode: 1,
                autoCropArea: 1,
                movable: true,
                zoomable: true,
                rotatable: true,
                scalable: true,
                cropBoxResizable: true
            });

            rotationAngles[imgId] = 0; // Reset rotation
        };
        reader.readAsDataURL(file);
    }

    function cropImage(imgId) {
        if (!cropperInstances[imgId]) return alert("No image selected for cropping!");

        const croppedCanvas = cropperInstances[imgId].getCroppedCanvas();
        if (!croppedCanvas) return alert("Cropping failed!");

        const imgElement = document.getElementById(imgId);
        imgElement.src = croppedCanvas.toDataURL();
        cropperInstances[imgId].destroy();
        cropperInstances[imgId] = null;
    }

    function rotateImage(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement || imgElement.src === "") return alert("No image selected!");

        rotationAngles[imgId] = (rotationAngles[imgId] + 90) % 360;
        imgElement.style.transform = `rotate(${rotationAngles[imgId]}deg)`;
    }

    function resetImage(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement) return;

        imgElement.src = "";
        imgElement.style.display = "none";
        imgElement.style.transform = "rotate(0deg)";

        if (cropperInstances[imgId]) {
            cropperInstances[imgId].destroy();
            cropperInstances[imgId] = null;
        }
    }

   
    function saveImage(imgId) {
        const imgElement = document.getElementById(imgId);
        if (!imgElement || imgElement.src === "") return alert("No image to save!");

        const link = document.createElement("a");
        link.href = imgElement.src;
        link.download = imgId + ".png";
        link.click();
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
    window.saveImage = saveImage;
    window.printFullPage = printFullPage;
    window.printIDCopy = printIDCopy;
    window.toggleMode = toggleMode;
    




  

});
