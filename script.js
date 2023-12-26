const getPlaylist = (event) => {
    event.preventDefault(); 
    const playlistName = document.getElementById("name").value;
    console.log("Playlist Name:", playlistName);
}

window.onload = () => {
    document.getElementById("add-playlist-form").onsubmit = getPlaylist;
}