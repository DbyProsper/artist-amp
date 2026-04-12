import { useEffect, useState } from 'react';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function FirebaseTest() {
  const [authStatus, setAuthStatus] = useState('Checking...');
  const [firestoreStatus, setFirestoreStatus] = useState('Checking...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        // Test Auth connection
        setAuthStatus('Testing Auth...');
        const auth = getAuth();
        // Just check if auth is initialized
        if (auth.app) {
          setAuthStatus('Auth initialized successfully');
        }

        // Test Firestore connection
        setFirestoreStatus('Testing Firestore...');
        const firestore = getFirestore();
        if (firestore.app) {
          setFirestoreStatus('Firestore initialized successfully');
        }

        // Try a simple Firestore operation
        setFirestoreStatus('Testing Firestore read...');
        // This will fail if Firestore is not enabled
        const testDoc = await firestore.collection('test').doc('test').get();
        setFirestoreStatus('Firestore read successful');

      } catch (err: any) {
        setError(err.message);
        if (err.message.includes('Database')) {
          setFirestoreStatus('Firestore not enabled in project');
        } else if (err.message.includes('offline')) {
          setFirestoreStatus('Firestore offline');
        }
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Firebase Connection Test</h2>

      <div className="space-y-2">
        <div>
          <strong>Auth Status:</strong> {authStatus}
        </div>
        <div>
          <strong>Firestore Status:</strong> {firestoreStatus}
        </div>
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>If Firestore shows "Database not found", you need to enable Firestore in your Firebase project.</p>
      </div>
    </div>
  );
}