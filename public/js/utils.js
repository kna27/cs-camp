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
