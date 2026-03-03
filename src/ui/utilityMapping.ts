const MIN_DB = -60;
const MAX_DB = 12;
const EXPONENT = 0.45; // lower makes 0db sit furter down.

// 0 → 1 =>
export function sliderNormalToDB(t: number) {
  const curved = Math.pow(t, EXPONENT);
  const db = MIN_DB + (MAX_DB - MIN_DB) * curved;
  return db;
}

export function dbToSliderNormal(db: number) {
  const linear = (db - MIN_DB) / (MAX_DB - MIN_DB);
  const t = Math.pow(linear, 1 / EXPONENT);
  return t;
}
