// this will login and get you the accessToken once you put up your credentials
async function getAccessToken() {
  const clientID = "YOUR_CLIENT_ID"; // Replace with your client ID
  const clientSecret = "YOUR_CLIENT_SECRET"; // Replace with your client secret
  const sharefileApiUrl = "https://YOUR_SUBDOMAIN.sharefile.com"; // Replace with your ShareFile subdomain

  // However you can still get the accessToken from your ShareFileAPI Documentation and use it as hardcoded for testing purposes 
  // but I would recommend you loggin in with the client credentials
  
  const response = await fetch(`${sharefileApiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch access token.");
  const data = await response.json();
  return data.access_token;
}

// This is your main function that has all the predefined parent path and the accessToken implementation to 
// search up the file directory and push to download the file
async function searchDirectoryForFile(parent, filename) {
  parent = formatDirectory(parent);
  parent = "/CUSTOMER UPLOADS (UNLIMITED RETENTION)/FILE Uploads/" + parent;
  const accessToken = await getAccessToken();
  const searchUrl = `${sharefileApiUrl}/sf/v3/Items?includeSubfolders=true&$filter=contains(Name, '${filename}') and contains(Parent, '${parent}')`;

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error("Error searching for files in folder.");
    const data = await response.json();

    console.log("API Response:", data); // Log the entire response for debugging just incase if you might need it

    if (data.value) {
      const file = data.value.find((item) => item.Name.includes(filename));

      if (file) {
        let parentDir = formatDirectory(file.Id);
        searchDirectoryForFile(parentDir, filename); // this will search up the directory of your folder and find you with the file you are looking for
      } else {
        console.log("File not found");
      }
    } else {
      console.log("No value found in response");
    }
  } catch (error) {
    console.error("Error:", error);
    $("#result").text("Error occurred while searching");
  }
}

// After the search is complete and the file is found, this will create a blob object and redirect you to the download url and hence downlod the file into your directory
async function downloadFileById(fileId) {
  const sharefileApiUrl = "https://YOUR_SUBDOMAIN.sharefile.com"; // Replace with your ShareFile subdomain
  const accessToken = await getAccessToken();
  const downloadUrl = `${sharefileApiUrl}/sf/v3/Items(${fileId})/Download`;

  try {
    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error("Error downloading the file.");

    const clonedResponse = response.clone(); // Clone the response to allow reading it twice

    try {
      const json = await response.json(); // Try parsing as JSON for a download URL
      if (json.DownloadUrl) {
        window.open(json.DownloadUrl, "_blank"); // Open the download URL in a new tab
        return;
      }
    } catch {
      // While testing i encountered problems where the ShareFileAPI doesn't return the json object so I implmeneted the code that would turn the response into blob 
      // and return you a workign download url for the file
      const blob = await clonedResponse.blob(); // creates the blob
      const downloadUrl = URL.createObjectURL(blob);

      const fileName =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || "downloaded-file";
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.click();
    }
  } catch (error) {
    console.error("Error:", error);
    $("#result").text("Error occurred while downloading the file");
  }
}
