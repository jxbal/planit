import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, DocumentData } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const addFavorite = async (userProfile: string, type: string, item: any) => {
  if (!userProfile || !item.id) {
    console.error("Invalid userProfile or item.id:", { userProfile, item });
    return;
  }

  try {
    const userRef = doc(collection(db, 'profiles'), userProfile);
    await setDoc(doc(collection(userRef, `favorites_${type}`), item.id), item);
    console.log(`${item.name} added to favorites.`);
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
};

export const removeFavorite = async (userProfile: string, type: string, itemId: string) => {
  if (!userProfile || !itemId) {
    console.error("Invalid userProfile or itemId:", { userProfile, itemId });
    return;
  }

  try {
    const userRef = doc(collection(db, 'profiles'), userProfile);
    await deleteDoc(doc(collection(userRef, `favorites_${type}`), itemId));
    console.log("Item removed from favorites.");
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};

export const getFavorites = async (userProfile: string, type: string) => {
  if (!userProfile) {
    console.error("Invalid userProfile:", userProfile);
    return [];
  }

  try {
    const userRef = doc(collection(db, 'profiles'), userProfile);
    const favoritesSnapshot = await getDocs(collection(userRef, `favorites_${type}`));
    const favorites = favoritesSnapshot.docs.map((doc: DocumentData) => doc.data());
    return favorites;
  } catch (error) {
    console.error('Error retrieving favorites:', error);
    return [];
  }
};
