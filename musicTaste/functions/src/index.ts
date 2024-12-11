import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set your SendGrid API key
sgMail.setApiKey(functions.config().sendgrid.key);

// Firestore trigger to send email and update Firestore on new profile creation
export const sendSpotifyURIsEmail = functions.firestore
  .document("profiles/{userId}")
  .onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    try {
      const userId = context.params.userId; // Get the userId from the context
      const userData = snap.data(); // Get the new user's data
      const newRedirectURIs = userData?.redirectURIs || []; // Get Spotify Redirect URIs

      if (newRedirectURIs.length === 0) {
        console.log("No redirect URIs found for this user.");
        return null;
      }

      // Prepare and send email
      const emailContent = {
        to: "nonstop.lmu.help@gmail.com", // Admin email
        from: "nonstop.lmu.help@gmail.com", // Verified sender email
        subject: "New Spotify Redirect URIs",
        text: `A new user has added the following Spotify Redirect URIs:\n\n${newRedirectURIs.join(
          "\n"
        )}`,
      };
      await sgMail.send(emailContent);
      console.log(
        `Email sent successfully to nonstop.lmu.help@gmail.com with URIs:`,
        newRedirectURIs
      );

      // Update Firestore
      await db
        .collection("profiles")
        .doc(userId)
        .update({
          redirectURIs: admin.firestore.FieldValue.arrayUnion(...newRedirectURIs),
        });

      console.log(`Redirect URIs successfully added to Firestore for user: ${userId}`);
      return null;
    } catch (error: any) {
      console.error("Error sending Spotify Redirect URIs email:", error);
      throw new Error("Failed to send Spotify Redirect URIs email.");
    }
  });

// Reverse Proxy Function
export const redirectProxy = functions.https.onRequest(async (req, res) => {
  try {
    const userId = req.query.state as string; // `state` identifies the user
    console.log("Received state parameter:", userId);

    if (!userId || userId === "no_user") {
      res.status(400).send("Invalid or missing state parameter.");
      return;
    }

    // Lookup the user-specific Redirect URI
    const userDoc = await db.collection("profiles").doc(userId).get();
    if (!userDoc.exists) {
      res.status(400).send("User not found.");
      return;
    }

    const userData = userDoc.data();
    const finalRedirectURI = userData?.redirectURI;

    if (!finalRedirectURI) {
      res.status(400).send("No redirect URI found for this user.");
      return;
    }

    // Append Spotify's query parameters to the final URI
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const redirectURL = `${finalRedirectURI}?${queryParams.toString()}`;

    // Notify admin via email
    const emailContent = {
      to: "nonstop.lmu.help@gmail.com", // Admin email
      from: "nonstop.lmu.help@gmail.com", // Verified sender email
      subject: "New User Signup - Nonstop Music",
      text: `A new user has signed up with the following user ID: ${userId}\n\nRedirect URI: ${finalRedirectURI}`,
    };
    await sgMail.send(emailContent);
    console.log(`Notification email sent for new user signup: ${userId}`);

    // Redirect to the final destination
    res.redirect(redirectURL);
  } catch (error) {
    console.error("Error handling redirect proxy:", error);
    res.status(500).send("Internal Server Error");
  }
});
