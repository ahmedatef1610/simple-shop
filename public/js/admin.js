const deleteProduct = (btn) => {
    const prodId = btn.parentNode.querySelector('[name="productId"]').value;
    const csrf = btn.parentNode.querySelector('[name="_csrf"]').value;

    const productElement= btn.closest('article');

    fetch(`/admin/product/${prodId}`, {
            method: 'delete',
            headers: {
                'csrf-token': csrf
            }
        })
        .then(res => {
            return res.json()
        })
        .then(data => {
            console.log(data);
            if(data.message == 'Success!'){
                productElement.parentNode.removeChild(productElement);
            }
        })
        .catch(err => {
            console.log(err);
        })
}

const deleteBtns = document.querySelectorAll('.deleteBtn');
deleteBtns.forEach(btn => {
    btn.onclick = () => {
        deleteProduct(btn);
    }
})

/*
<form action="/admin/delete-product" method="POST">
    <input type="hidden" name="productId" value="<%= product._id %>" >
    <input type="hidden" name="_csrf" value="<%= csrfToken  %>">
    <button class="btn" type="submit">Delete</button>
</form>

onclick="deleteProduct()"
*/