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
