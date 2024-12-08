import React, { useEffect } from "react";

const SpotifyAuth = ({ onTokenFetched }) => {
  const client_id = "d442d42b1e6f4b37ad8305f045d5d160";
  const client_secret = "9f641cacf31e4745a6fd9a0d3de5e951";

  useEffect(() => {
    const getAuthToken = async () => {
      const body = "grant_type=client_credentials";

      const authHeader = "Basic " + btoa(`${client_id}:${client_secret}`);

      const authOptions = {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body,
      };

      try {
        const response = await fetch(
          "https://accounts.spotify.com/api/token",
          authOptions
        );
        if (response.ok) {
          const data = await response.json();
          if (onTokenFetched) {
            onTokenFetched(data.access_token);
          }
        } else {
          const errorData = await response.json();
          console.error("Failed to fetch token:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error during fetch:", error);
      }
    };

    getAuthToken();
  }, [client_id, client_secret, onTokenFetched]);

  return null;
};

export default SpotifyAuth;
