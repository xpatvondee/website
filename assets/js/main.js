// Main JavaScript for the Community Garden website
// Handles loading and submitting blog posts using Firestore

document.addEventListener('DOMContentLoaded', function () {
    // Load blog posts when the page loads
    loadBlogPosts();

    // Handle post submission
    const postForm = document.getElementById('post-form');
    if (postForm) {
        postForm.addEventListener('submit', function (event) {
            event.preventDefault();
            submitPost();
        });
    }
});

/**
 * Load blog posts from Firestore and display them
 */
function loadBlogPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    postsContainer.innerHTML = '<p>Loading posts...</p>';

    // Fetch posts from Firestore, ordered by timestamp (newest first)
    db.collection("posts").orderBy("timestamp", "desc").get()
        .then(snapshot => {
            postsContainer.innerHTML = '';
            if (snapshot.empty) {
                postsContainer.innerHTML = '<p>No posts yet.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const post = doc.data();
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.innerHTML = `<h3>${post.title}</h3><p>${post.content}</p>`;
                postsContainer.appendChild(postElement);
            });
        })
        .catch(error => {
            postsContainer.innerHTML = `<p>Error loading posts: ${error.message}</p>`;
        });
}

/**
 * Submit a new blog post to Firestore
 */
function submitPost() {
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    if (!titleInput.value || !contentInput.value) return;

    db.collection("posts").add({
        title: titleInput.value,
        content: contentInput.value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        titleInput.value = '';
        contentInput.value = '';
        loadBlogPosts(); // Reload posts to include the new one
    })
    .catch(error => {
        alert("Error submitting post: " + error.message);
    });
}