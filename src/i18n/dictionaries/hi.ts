import type { Dictionary } from './en';

// Hindi first drafts — to be checked by the owners' Hindi reviewer.
// A missing or empty string falls back to English (see get-dictionary.ts).
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

const hi: DeepPartial<Dictionary> = {
  auth: {
    signInWithGoogle: 'Google से साइन इन करें',
    signInPrompt: 'आगे बढ़ने के लिए कृपया अपने Google खाते से साइन इन करें।',
    adminsOnly: 'यह हिस्सा केवल दुकान के एडमिन के लिए है।',
    signingIn: 'साइन इन हो रहा है…',
    signInFailed: 'साइन इन पूरा नहीं हुआ। कृपया फिर से कोशिश करें।',
    signOut: 'साइन आउट',
    loading: 'लोड हो रहा है…',
  },
};

export default hi;
