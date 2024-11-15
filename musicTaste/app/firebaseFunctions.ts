// firebaseFunctions.ts
import { db } from '../firebaseConfig';
import firebase from 'firebase/app';
import { DocumentData } from 'firebase/firestore';

export const addFavorite = async (userId: string, type: string, item: any) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.collection(`favorites_${type}`).doc(item.id).set(item);
    console.log(`${item.name} added to favorites.`);
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
};

export const removeFavorite = async (userId: string, type: string, itemId: string) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.collection(`favorites_${type}`).doc(itemId).delete();
    console.log('Item removed from favorites.');
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};

export const getFavorites = async (userId: string, type: string) => {
  try {
    const userRef = db.collection('users').doc(userId);
    const favoritesSnapshot = await userRef.collection(`favorites_${type}`).get();
    const favorites = favoritesSnapshot.docs.map((doc: DocumentData) => doc.data());
    return favorites;
  } catch (error) {
    console.error('Error retrieving favorites:', error);
    return [];
  }
};
