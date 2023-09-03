const fullscreenImages = () => {
    const fullPage = Object.assign(document.body.appendChild(document.createElement('div')), {
        id: 'fullpage',
        onclick: function () { this.style.display = 'none'; }
    });

    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
        img.addEventListener('click', function () {
            fullPage.style.backgroundImage = 'url(' + img.src + ')';
            fullPage.style.display = 'block';
        });
    });

}

const previewUploads = (inputId, previewContainerId) => {
    document.querySelector(`input[name="${inputId}"]`).addEventListener('change', function () {
        let preview = document.querySelector(`#${previewContainerId}`);
        preview.innerHTML = '';
        for (const file of this.files) {
            let img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            preview.appendChild(img);
        }
    });
}

const deleteImage = (deleteBtnClass, imgContainerId, family) => {
    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains(deleteBtnClass)) {
            e.preventDefault();
            const imageName = e.target.getAttribute('data-image');
            try {
                if (family == null) {
                    if (e.target.getAttribute('data-family') != null) {
                        family = e.target.getAttribute('data-family');
                    }
                    else {
                        console.error('Family not found');
                        return;
                    }
                }
                const response = await fetch(`/delete-image?family=${family}&image=${imageName}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    const imageContainer = e.target.closest(`#${imgContainerId}`);
                    if (imageContainer) {
                        imageContainer.remove();
                    }
                } else {
                    console.error('Failed to delete the image');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    });
}

const compressImages = (fileInputId) => {
    const maxDimension = 1500;
    const quality = 0.8;

    const dataURLToBlob = (dataURL) => {
        const byteString = atob(dataURL.split(',')[1]);
        const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    const fileInput = document.getElementById(fileInputId);

    fileInput.addEventListener("change", function () {
        const files = fileInput.files;
        const compressedFiles = [];

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.src = event.target.result;
                img.onload = function () {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    let width = img.width;
                    let height = img.height;
                    const aspectRatio = width / height;
                    if (width > height) {
                        if (width > maxDimension) {
                            width = maxDimension;
                            height = width / aspectRatio;
                        }
                    } else {
                        if (height > maxDimension) {
                            height = maxDimension;
                            width = height * aspectRatio;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataURL = canvas.toDataURL("image/jpeg", quality);
                    const blob = dataURLToBlob(dataURL);
                    compressedFiles.push(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                    if (compressedFiles.length === files.length) {
                        fileInput.value = "";
                        let list = new DataTransfer();
                        for (let i = 0; i < compressedFiles.length; i++) {
                            list.items.add(compressedFiles[i]);
                        }
                        fileInput.files = list.files;
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    });
}
