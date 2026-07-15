// 만 나이 계산 — 회원가입/프로필의 생년월일("YYYY-MM-DD")에서 나이를 파생한다.
// (설문에서 나이 문항이 제거되어 분석 시 이 값을 주입)

/**
 * @param {number} year @param {number} month @param {number} day
 * @returns {number} 만 나이
 */
function ageFromParts(year, month, day) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * @param {string} [birth] "YYYY-MM-DD"
 * @returns {number | undefined} 만 나이 (무효/누락이면 undefined)
 */
function ageFromBirth(birth) {
  if (!birth) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return ageFromParts(y, mo, d);
}

module.exports = { ageFromParts, ageFromBirth };
