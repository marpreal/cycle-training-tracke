import { TRAINING_PLANS_KEY, type TrainingPlan } from "@/lib/appTypes";

const DB_NAME = "cycle-training-tracker";
const DB_VERSION = 1;
const STORE_NAME = "training-plans";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePlansToIDB(plans: TrainingPlan[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(plans, "all");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPlansFromIDB(): Promise<TrainingPlan[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("all");
      req.onsuccess = () => {
        const val = req.result as TrainingPlan[] | undefined;
        resolve(Array.isArray(val) ? val : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * One-time migration: move plans from localStorage into IndexedDB and
 * remove the localStorage key so it never causes a quota error again.
 */
export async function migratePlansFromLocalStorage(): Promise<TrainingPlan[]> {
  const raw = localStorage.getItem(TRAINING_PLANS_KEY);
  if (!raw) return [];
  let plans: TrainingPlan[];
  try {
    const parsed = JSON.parse(raw) as TrainingPlan[];
    if (!Array.isArray(parsed)) return [];
    plans = parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.content === "string",
    );
  } catch {
    return [];
  }
  if (plans.length > 0) {
    await savePlansToIDB(plans);
  }
  localStorage.removeItem(TRAINING_PLANS_KEY);
  return plans;
}
