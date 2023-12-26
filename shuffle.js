/* Client ID from Spotify developer app. */
const clientId = "614e51c74d164d949a5c609e1330a6be";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

/* If user has not authenticated, have them do Spotify login */
if (!code) {
    console.log("Authenticating user Spotify account.");
    redirectToAuthCodeFlow(clientId);
/* If user has authenticated, randomize Spotify playlist */
} 

async function shufflePlaylist() {
    // const playlist_id: string = "3obuCNKjWDDp8hs2IicCm0";
    const messageContainer = document.getElementById("message-container");
    const playlist_id = document.getElementById("name").value;
    const num_songs = 75;
    console.log("User authenticated. Randomizing playlist.")
    const accessToken = await getAccessToken(clientId, code);
    const tracks = await getPlaylistTracks(accessToken, playlist_id);
    randomizeSongs(accessToken, tracks, num_songs);

    messageContainer.innerHTML = "Songs successfully added to queue!";
}

async function redirectToAuthCodeFlow(clientId) {
    /** Have user go through Spotify authorization to obtain code. */
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    /* Create URL for spotify authorization */
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5500");
    params.append("scope", "app-remote-control playlist-read-private user-read-private user-modify-playback-state");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    /** Authenticate user using Spotify PKCE method */
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    /** Authenticate user using Spotify PKCE method with SHA-256 hashing */
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function getAccessToken(clientId, code) {
    /** Get access token to be used for all Spotify API requests.
     * 
     * Args:
     * - clientId: Client ID from Spotify
     * - code: Authentication code 
     * 
     * Output:
     * - access_token: Access token for Spotify API requests 
     */
    const verifier = localStorage.getItem("verifier");

    /* Create GET request to get access token */
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5500");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function randomizeSongs(token, tracks, num_songs) {
    /* Randomly select songs from playlist and add to current Spotify queue.
    
    Args:
    - access_code: Spotify API access code.
    - tracks: List of Spotify track IDs to select randomly from.
    - num_tracks: Number of songs to randomly select and add.
    */

    // Randomly sample num_tracks tracks from playlist
    // Fisher-Yates shuffle algorithm randomizes all tracks
    let shuffled = tracks.slice(0)
    let i = tracks.length
    let temp;
    let rand_index;

    while (i--) {
        rand_index = Math.floor((i + 1) * Math.random());
        temp = shuffled[rand_index];
        shuffled[rand_index] = shuffled[i];
        shuffled[i] = temp;
    }

    /* URL for adding songs to Spotify queue. */
    const url = 'https://api.spotify.com/v1/me/player/queue';
    const request_url = `${url}?uri=spotify:track`;

    // Add 'num_song' random tracks to queue 
    shuffled.slice(0, num_songs).forEach(async function(track_id) {
        try {
            const result = await fetch(`${request_url}:${track_id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!result.ok) {
                throw new Error(`Failed to add song to queue. ${result.status} ${result.statusText}`);
            }

            console.log(`Successfully added song ${track_id}`);
        }
        catch(error) {
            console.log(error);
        }
    });

    console.log(`Added ${num_songs} songs to queue.`)
}

async function getPlaylistTracks(token, playlist_id) {
    /* Get all tracks in a given Spotify playlist.
    
    Args:
    - access_token: Spotify API access token.
    - playlist_id: Spotify playlist ID for playlist.

    Output:
    - tracks: List of Spotify IDs for each track in playlist.
    */

    const url = "https://api.spotify.com/v1/playlists";

    let request_url = `${url}/${playlist_id}/tracks`;
    
    // tracks holds the Spotify ID of tracks
    let tracks = [];

    while(request_url) {
        try {
            const result = await fetch(request_url, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!result.ok) {
                throw new Error(`Failed to get user playlist. ${result.status} ${result.statusText}`);
            }

            const data = await result.json();
            // tracks.extend([track['track']['id'] for track in data['items']])
            tracks = tracks.concat(data.items.map(song => song.track.id));

            // Spotify paginates responses, so we need to fetch the next set of tracks
            request_url = data.next;
        }
        catch (error) {
            console.log(error);
        }
    }
        
    return tracks;
}

window.onload = () => {
    document.getElementById("shuffle-button").onclick = shufflePlaylist;
}