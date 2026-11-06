import type { Dictionary } from './en';

// Hindi first drafts — to be checked by the owners' Hindi reviewer.
// A missing or empty string falls back to English (see get-dictionary.ts).
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

const hi: DeepPartial<Dictionary> = {
  meta: {
    title: 'गंगासागर, नांदेड़',
    description: 'गंगासागर, नांदेड़। ऑनलाइन खरीदें और दुकान से लें, या घर मंगवाएं।',
  },
  nav: {
    home: 'होम',
    shop: 'दुकान',
    cart: 'कार्ट',
    admin: 'एडमिन',
    menu: 'मेन्यू',
    skipToContent: 'मुख्य सामग्री पर जाएं',
  },
  lang: {
    switchTo: 'English',
    switchLabel: 'View in English',
  },
  home: {
    since: '2005 से',
    shopNow: 'अभी खरीदें',
    call: 'कॉल करें',
    whatsapp: 'व्हाट्सऐप',
    directions: 'रास्ता देखें',
    hours: 'रोज़ सुबह 8 से रात 8 बजे तक खुला',
    whatsappHello: 'नमस्ते गंगासागर, मेरा एक सवाल है।',
  },
  footer: {
    contact: 'संपर्क',
    callUs: 'कॉल करें',
    whatsappUs: 'व्हाट्सऐप करें',
    support: 'सहायता',
    hours: 'रोज़ सुबह 8 से रात 8 बजे तक खुला',
    since: '2005 से नांदेड़ की सेवा में',
  },
  common: {
    close: 'बंद करें',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    saving: 'सहेजा जा रहा है…',
    delete: 'हटाएं',
    confirm: 'पुष्टि करें',
    retry: 'फिर से कोशिश करें',
    notFound: 'माफ़ कीजिए, यह पेज नहीं मिला।',
    backToShop: 'दुकान पर वापस जाएं',
    somethingWrong: 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।',
  },
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
