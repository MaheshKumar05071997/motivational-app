export const DAILY_QUOTES = [
  {
    day: 1,
    text: "जीवन बदलना है तो सबसे पहले सोच बदलनी होगी।",
    author: "Mukesh Bhai",
  },
  {
    day: 2,
    text: "जो आज दर्द दे रहा है, वही कल ताकत बनेगा।",
    author: "Motivation",
  },
  {
    day: 3,
    text: "हर दिन एक नया मौका है, बस नज़र चाहिए।",
    author: "Mukesh Bhai",
  },
  {
    day: 4,
    text: "खुद पर विश्वास करना सबसे बड़ी पूँजी है।",
    author: "Self Belief",
  },
  {
    day: 5,
    text: "जो समय की क़दर करता है, समय उसकी क़दर करता है।",
    author: "Time Management",
  },
  // Add more quotes here...
];

export function getQuoteOfTheDay() {
  // Logic to pick a quote based on Today's Date (Day of Year)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Cycle through the list endlessly
  const index = dayOfYear % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}