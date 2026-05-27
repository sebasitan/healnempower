export const AFFIRMATIONS = [
  "I train with purpose. Every rep builds a stronger version of me.",
  "Pressure is a privilege. I rise to meet it.",
  "My mind is my edge. I sharpen it daily.",
  "I am calm, focused, and unshakable under pressure.",
  "Setbacks are setups for comebacks.",
  "I trust the work I've put in.",
  "Discipline today. Glory tomorrow.",
  "I compete against who I was yesterday.",
  "My breath is my anchor. My focus is my weapon.",
  "I belong on this field. I've earned my place.",
  "Confidence is a habit. I practice it daily.",
  "I play free. I play fearless.",
  "Every champion was once a beginner who refused to quit.",
  "Energy flows where attention goes.",
  "I am the athlete I'm becoming.",
];

export function affirmationOfDay() {
  const day = Math.floor(Date.now() / 86400000);
  return AFFIRMATIONS[day % AFFIRMATIONS.length];
}
