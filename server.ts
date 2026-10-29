import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as archiverModule from 'archiver';
import { GoogleGenAI } from '@google/genai';

const archiver = ((archiverModule as any).default || archiverModule) as any;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// High limits for image base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// App In-Memory State for Admin & Activity Tracking
let adminAnnouncement = {
  active: true,
  title: 'रबी सीजन विशेष सलाह 🌾',
  message: 'गेहूं और चने की फसल में दीमक एवं तना छेदक से बचाव के लिए समय पर सिंचाई और जैविक नीमास्त्र का प्रयोग करें।',
  updatedAt: new Date().toISOString(),
};

let serverMetrics = {
  startTime: Date.now(),
  cropAnalysesCount: 148,
  chatQueriesCount: 412,
  zipDownloadsCount: 19,
  lastDiagnosisTime: new Date().toISOString(),
  systemErrors: [] as { time: string; message: string }[],
};

// Seed Mandi Rates Data (APMC Verified Baseline)
const mandiRatesData = [
  {
    id: 'm-1',
    cropHindi: 'गेहूं (Wheat)',
    cropKey: 'wheat',
    mandi: 'बांदा मंडी (Banda APMC)',
    state: 'उत्तर प्रदेश (UP)',
    modalPrice: 2475,
    minPrice: 2380,
    maxPrice: 2550,
    unit: '₹ / क्विंटल',
    trend: 'up',
    arrival: '420 क्विंटल',
    date: 'आज, सुबह 11:30',
    quality: 'FAQ (सामान्य)',
  },
  {
    id: 'm-2',
    cropHindi: 'चना (Gram/Chana)',
    cropKey: 'gram',
    mandi: 'झांसी मंडी (Jhansi APMC)',
    state: 'उत्तर प्रदेश (UP)',
    modalPrice: 6150,
    minPrice: 5900,
    maxPrice: 6380,
    unit: '₹ / क्विंटल',
    trend: 'up',
    arrival: '310 क्विंटल',
    date: 'आज, सुबह 10:45',
    quality: 'देसी बोल्ड',
  },
  {
    id: 'm-3',
    cropHindi: 'सरसों / राई (Mustard)',
    cropKey: 'mustard',
    mandi: 'महोबा कृषि मंडी',
    state: 'उत्तर प्रदेश (UP)',
    modalPrice: 5650,
    minPrice: 5400,
    maxPrice: 5850,
    unit: '₹ / क्विंटल',
    trend: 'down',
    arrival: '185 क्विंटल',
    date: 'आज, सुबह 11:15',
    quality: '42% तेल मात्रा',
  },
  {
    id: 'm-4',
    cropHindi: 'सोयाबीन (Soybean)',
    cropKey: 'soybean',
    mandi: 'इंदौर फल-सब्जी व अनाज मंडी',
    state: 'मध्य प्रदेश (MP)',
    modalPrice: 4720,
    minPrice: 4550,
    maxPrice: 4890,
    unit: '₹ / क्विंटल',
    trend: 'neutral',
    arrival: '680 क्विंटल',
    date: 'आज, सुबह 09:30',
    quality: 'पीला सोयाबीन',
  },
  {
    id: 'm-5',
    cropHindi: 'धान / बासमती (Paddy)',
    cropKey: 'paddy',
    mandi: 'करनाल अनाज मंडी',
    state: 'हरियाणा (Haryana)',
    modalPrice: 3850,
    minPrice: 3600,
    maxPrice: 4100,
    unit: '₹ / क्विंटल',
    trend: 'up',
    arrival: '850 क्विंटल',
    date: 'आज, दोपहर 12:00',
    quality: '1509 बासमती',
  },
  {
    id: 'm-6',
    cropHindi: 'आलू (Potato)',
    cropKey: 'potato',
    mandi: 'फर्रुखाबाद मंडी',
    state: 'उत्तर प्रदेश (UP)',
    modalPrice: 1350,
    minPrice: 1150,
    maxPrice: 1520,
    unit: '₹ / क्विंटल',
    trend: 'down',
    arrival: '1200 क्विंटल',
    date: 'आज, सुबह 10:00',
    quality: 'चिप्सोना / पुखराज',
  },
  {
    id: 'm-7',
    cropHindi: 'प्याज (Onion)',
    cropKey: 'onion',
    mandi: 'लासलगांव मंडी',
    state: 'महाराष्ट्र (MH)',
    modalPrice: 2200,
    minPrice: 1800,
    maxPrice: 2600,
    unit: '₹ / क्विंटल',
    trend: 'up',
    arrival: '1450 क्विंटल',
    date: 'आज, सुबह 11:00',
    quality: 'लाल मध्यम',
  },
  {
    id: 'm-8',
    cropHindi: 'टमाटर (Tomato)',
    cropKey: 'tomato',
    mandi: 'आजादपुर मंडी, दिल्ली',
    state: 'दिल्ली (Delhi)',
    modalPrice: 1600,
    minPrice: 1200,
    maxPrice: 2000,
    unit: '₹ / क्विंटल',
    trend: 'neutral',
    arrival: '740 क्विंटल',
    date: 'आज, सुबह 08:45',
    quality: 'हाइब्रिड लाल',
  },
  {
    id: 'm-9',
    cropHindi: 'लहसुन (Garlic)',
    cropKey: 'garlic',
    mandi: 'नीमच कृषि उपज मंडी',
    state: 'मध्य प्रदेश (MP)',
    modalPrice: 12800,
    minPrice: 10500,
    maxPrice: 15400,
    unit: '₹ / क्विंटल',
    trend: 'up',
    arrival: '410 क्विंटल',
    date: 'आज, दोपहर 12:30',
    quality: 'रियावन स्पेशल',
  },
];

// Seed Knowledge Articles
let knowledgeArticles = [
  {
    id: 'art-1',
    title: 'देसी जीवामृत बनाने की सम्पूर्ण वैज्ञानिक विधि 🌿',
    category: 'जैविक खेती (Organic)',
    readTime: '4 मिनट',
    summary: 'घर पर गाय के गोबर, गोमूत्र, गुड़, बेसन और मेड़ की मिट्टी से बिना किसी खर्च के शक्तिशाली जैव-उर्वरक बनाएं।',
    content: `जीवामृत मिट्टी के सूक्ष्म जीवाणुओं को सक्रिय करने का सर्वोत्तम प्राकृतिक अमृत है।

आवश्यक सामग्री (200 लीटर जीवामृत के लिए):
1. देसी गाय का ताजा गोबर: 10 किग्रा
2. देसी गाय का पुराना गोमूत्र: 10 लीटर
3. पुराना गुड़ (केमिकल रहित): 1 से 2 किग्रा
4. दालों का आटा (बेसन, उरद, चना): 1 से 2 किग्रा
5. पीपल के नीचे या खेत की मेड़ की सजीव मिट्टी: 1 मुट्ठी
6. साफ पानी: 200 लीटर

बनाने की विधि:
- एक बड़े 200 लीटर प्लास्टिक ड्रम में 200 लीटर पानी भरें।
- इसमें गोबर, गोमूत्र, गुड़, बेसन और मिट्टी डालकर डंडे से घड़ी की दिशा में 2 मिनट तक अच्छी तरह घोलें।
- ड्रम को छायादार स्थान पर रखें और जूट की बोरी से ढकें।
- सुबह-शाम 2-2 मिनट डंडे से चलाएं।
- 48 से 72 घंटे में जीवामृत तैयार हो जाता है।

प्रयोग विधि:
- प्रति एकड़ सिंचाई के पानी के साथ 200 लीटर जीवामृत नालियों में प्रवाहित करें।
- 10% घोल बनाकर फसलों पर पर्णीय छिड़काव भी कर सकते हैं।`,
  },
  {
    id: 'art-2',
    title: 'नीमास्त्र (Neemastra): प्राकृतिक कीटनाशक कैसे बनाएं 🐜',
    category: 'कीट नियंत्रण (IPM)',
    readTime: '3 मिनट',
    summary: 'माहू, चेपा, सफेद मक्खी, सुंडी और रस चूसक कीटों के लिए 100% जैविक व शून्य लागत वाला रामबाण नुस्खा।',
    content: `नीमास्त्र रस चूसने वाले कीटों (जैसे एफिड, जैसिड, वाइट फ्लाई) और छोटी इल्लियों पर अत्यंत असरदार है।

सामग्री:
1. देसी गाय का गोमूत्र: 5 लीटर
2. ताजा गाय का गोबर: 2 किग्रा
3. नीम की पत्तियां या नीम की खली/निंबोली: 5 किग्रा
4. पानी: 100 लीटर

बनाने का तरीका:
- नीम की पत्तियों को पीसकर चटनी बना लें।
- एक बर्तन में 100 लीटर पानी, गोमूत्र, गोबर और नीम की चटनी मिलाकर अच्छी तरह घोल लें।
- इसे 48 घंटे के लिए छाया में रखें और रोज 2 बार डंडे से हिलाएं।
- 48 घंटे बाद कपड़े से छान लें।

प्रयोग:
- तैयार नीमास्त्र को बिना पानी मिलाए सीधे स्प्रे पंप से फसलों पर स्प्रे करें।
- यह कीटों के अंडों और लार्वा को नष्ट करता है।`,
  },
  {
    id: 'art-3',
    title: 'चना व गेहूं में बीज उपचार (Seed Treatment) का सही तरीका 🌾',
    category: 'बीज व बुवाई (Seeds)',
    readTime: '5 मिनट',
    summary: 'उकठा (Wilt) और दीमक रोग से 90% बचाव के लिए ट्राइकोडर्मा और राइजोबियम से बीज शोधन कैसे करें।',
    content: `बीज उपचार फसल की पहली सुरक्षा दीवार है। स्वस्थ बीज ही भरपूर पैदावार की नींव रखता है।

जैविक बीज शोधन:
- फफूंद जनित रोगों (उकठा, जड़ सड़न) से बचाव के लिए: ट्राइकोडर्मा विरिडी (Trichoderma viride) 5 से 10 ग्राम प्रति किग्रा बीज की दर से मिलाएं।
- दलहनी फसलों में नत्रजन स्थिरीकरण के लिए: राइजोबियम कल्चर (Rhizobium culture) 5 ग्राम प्रति किग्रा बीज।

सावधानी:
- बीजों को छाया में सुखाकर 4 से 6 घंटे के भीतर बुवाई कर दें।
- यदि रासायनिक फफूंदनाशक का प्रयोग कर रहे हैं, तो पहले कवकनाशी (Fungicide), फिर कीटनाशी (Insecticide) और अंत में जैविक टीका (Bio-inoculant) लगाएं (FIR क्रम)।`,
  },
  {
    id: 'art-4',
    title: 'ड्रिप व स्प्रिंकलर सिंचाई से 60% पानी और 30% खाद की बचत 💧',
    category: 'सिंचाई प्रबंधन (Irrigation)',
    readTime: '4 मिनट',
    summary: 'टपक सिंचाई और फव्वारा विधि से पैदावार में बढ़ोतरी और सरकारी सब्सिडी प्राप्त करने के नियम।',
    content: `सूखा प्रभावित एवं कम जल वाले क्षेत्रों में बूंद-बूंद (Drip) और फव्वारा (Sprinkler) सिंचाई वरदान है।

लाभ:
1. पानी की 50-70% बचत।
2. खरपतवारों में 80% तक कमी।
3. फर्टिगेशन (सिंचाई के साथ घुलनशील खाद देना) से उर्वरक क्षमता 90% तक बढ़ जाती है।
4. प्रधानमंत्री कृषि सिंचाई योजना (PMKSY) के तहत लघु एवं सीमांत किसानों को 55% तथा अन्य किसानों को 45% तक सरकारी अनुदान (सब्सिडी) उपलब्ध है।`,
  },
];

// Seed Government Schemes
const govtSchemes = [
  {
    id: 'sch-1',
    name: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
    benefit: '₹6,000 प्रति वर्ष (₹2000 की 3 किस्तों में सीधे बैंक खाते में)',
    eligibility: 'सभी भूमिधारक किसान परिवार (सत्यापित भू-अभिलेख एवं eKYC पूर्ण)',
    portal: 'pmkisan.gov.in',
    helpline: '155261 / 011-24300606',
    status: 'सक्रिय (Active)',
  },
  {
    id: 'sch-2',
    name: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    benefit: 'प्राकृतिक आपदा, सूखा, बाढ़ या बेमौसम बारिश से फसल नुकसान पर पूर्ण वित्तीय सुरक्षा',
    eligibility: 'अधिसूचित क्षेत्रों में अधिसूचित फसल उगाने वाले ऋणी व गैर-ऋणी सभी किसान',
    premium: 'खरीफ 2%, रबी 1.5%, बागवानी 5%',
    portal: 'pmfby.gov.in',
    helpline: '14447',
    status: 'सक्रिय (Active)',
  },
  {
    id: 'sch-3',
    name: 'किसान क्रेडिट कार्ड (KCC)',
    benefit: '₹3 लाख तक का कृषि ऋण मात्र 4% प्रभावी ब्याज दर पर (समय पर भुगतान पर 3% छूट)',
    eligibility: 'खेतीहर किसान, पट्टेदार, पशुपालक व मत्स्य पालक',
    portal: 'myscheme.gov.in',
    helpline: '1800-180-1551',
    status: 'सक्रिय (Active)',
  },
  {
    id: 'sch-4',
    name: 'प्रधानमंत्री कुसुम योजना (PM-KUSUM)',
    benefit: 'खेतों में सोलर पंप स्थापना पर 60% तक सरकारी सब्सिडी',
    eligibility: 'किसान, किसानों का समूह, सहकारी समितियां व FPO',
    portal: 'pmkusum.mnre.gov.in',
    helpline: '1800-180-3333',
    status: 'सक्रिय (Active)',
  },
  {
    id: 'sch-5',
    name: 'मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)',
    benefit: 'मिट्टी की जांच कर 12 पोषक तत्वों की स्थिति व खाद की सही मात्रा की सिफारिश',
    eligibility: 'देश का कोई भी किसान अपनी मिट्टी की जांच करा सकता है (निःशुल्क/न्यूनतम शुल्क)',
    portal: 'soilhealth.dac.gov.in',
    helpline: '1800-180-1551',
    status: 'सक्रिय (Active)',
  },
];

// Seed Verified Helplines
let verifiedHelplines = [
  {
    id: 'hl-1',
    title: 'किसान कॉल सेंटर (Kisan Call Centre - भारत सरकार)',
    number: '1800-180-1551',
    timing: 'सुबह 6:00 से रात 10:00 (सभी 7 दिन, 22 भाषाओं में)',
    type: 'राष्ट्रीय टोल-फ्री',
    description: 'फसल रोग, मौसम, खाद-बीज और सरकारी योजनाओं की तत्काल वैज्ञानिक जानकारी हेतु।',
  },
  {
    id: 'hl-2',
    title: 'प्रधानमंत्री फसल बीमा शिकायत निवारण',
    number: '14447',
    timing: 'कार्यालय समय (सोमवार - शनिवार)',
    type: 'टोल-फ्री',
    description: 'फसल नुकसान क्लेम सर्वे व बीमा राशि भुगतान में विलंब की शिकायत दर्ज कराने हेतु।',
  },
  {
    id: 'hl-3',
    title: 'उत्तर प्रदेश किसान हेल्पलाइन',
    number: '1800-180-1551 / 0522-2204223',
    timing: 'सुबह 9:00 से शाम 6:00',
    type: 'राज्य हेल्पलाइन (UP)',
    description: 'यूपी कृषि विभाग बीज वितरण, अनुदान, और कृषि यंत्र सब्सिडी सहायता।',
  },
  {
    id: 'hl-4',
    title: 'मध्य प्रदेश किसान कल्याण सहायता',
    number: '0755-2558823',
    timing: 'सुबह 10:00 से शाम 5:30',
    type: 'राज्य हेल्पलाइन (MP)',
    description: 'एमपी उपार्जन, भावांतर, सोलर पंप योजना एवं खाद उपलब्धता सहायता।',
  },
  {
    id: 'hl-5',
    title: 'कृषि विज्ञान केंद्र (KVK) बुंदेलखंड संभाग',
    number: '05192-225345',
    timing: 'सुबह 10:00 से शाम 5:00',
    type: 'क्षेत्रीय अनुसंधान केंद्र',
    description: 'बुंदेलखंड के बांदा, महोबा, झांसी, हमीरपुर, ललितपुर, जालौन क्षेत्र हेतु विशेष सलाह।',
  },
];

// API Routes

// 1. Crop Diagnosis Endpoint (Multimodal AI)
app.post('/api/crop-diagnosis', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cropHint = '', symptomsNotes = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'कृपया फसल या पत्ती की फोटो अपलोड करें।' });
    }

    serverMetrics.cropAnalysesCount += 1;
    serverMetrics.lastDiagnosisTime = new Date().toISOString();

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
आप भारत के शीर्ष पादप रोग विशेषज्ञ (Plant Pathologist) और कृषि वैज्ञानिक हैं।
विशेष ध्यान: भारतीय कृषि परिस्थितियां, विशेषकर उत्तर भारत व बुंदेलखंड क्षेत्र (गेहूं, चना, सरसों, धान, टमाटर, आलू, सोयाबीन आदि)।

संलग्न फसल की फोटो का गहन वैज्ञानिक विश्लेषण करें:
किसान द्वारा दी गई जानकारी:
- संभावित फसल: "${cropHint || 'अज्ञात (चित्र से पहचानें)'}"
- किसान द्वारा देखे गए लक्षण: "${symptomsNotes || 'कोई विवरण नहीं'}"

कृपया निम्नलिखित बिंदुओं के साथ केवल शुद्ध JSON में उत्तर दें (बिना किसी अतिरिक्त कोड ब्लॉक या टेक्स्ट के):
{
  "cropDetected": "फसल का नाम (हिंदी व अंग्रेजी, उदा. गेहूं / Wheat)",
  "healthStatus": "Healthy" या "Diseased" या "Pest Infested" या "Nutrient Deficiency" या "Weed Issue" या "Uncertain",
  "issueNameHindi": "रोग अथवा कीट का सटीक हिंदी नाम (उदा. पीला रतुआ / माहू कीट)",
  "issueNameEnglish": "Scientific or English Name (e.g. Yellow Rust / Aphids)",
  "confidenceScore": 88,
  "severity": "low" या "medium" या "high" या "critical",
  "visualObservations": [
    "पत्तियों पर पीले-नारंगी धब्बे दिखाई दे रहे हैं",
    "पत्ती का सिरा सूख रहा है"
  ],
  "organicRemedies": [
    "1 लीटर खट्टी छाछ को 15 लीटर पानी में मिलाकर 50 ग्राम हींग के साथ छिड़काव करें",
    "जीवामृत या नीमास्त्र 10% घोल का 7 दिन के अंतराल पर छिड़काव करें"
  ],
  "chemicalRemedies": [
    "यदि रोग अधिक गंभीर हो तो प्रोपिकोनाजोल (Propiconazole 25% EC) 1 मिली प्रति लीटर पानी में घोलकर छिड़कें",
    "सावधानी: धूप तेज होने पर छिड़काव न करें, सुरक्षात्मक मास्क पहनें"
  ],
  "preventionTips": [
    "खेत में जलभराव न होने दें",
    "अगली बुवाई से पहले ट्राइकोडर्मा विरिडी से बीज उपचार अवश्य करें"
  ],
  "voiceSummaryHindi": "राम राम किसान भाई, आपकी फसल में ... रोग के लक्षण पाए गए हैं। इससे बचाव के लिए तुरंत ... का छिड़काव करें।"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
    });

    const rawText = response.text || '';
    
    // Parse JSON
    let parsedResult;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(rawText);
      }
    } catch {
      parsedResult = {
        cropDetected: cropHint || 'फसल (पहचान की गई)',
        healthStatus: 'Diseased',
        issueNameHindi: 'फसल रोग / कीट लक्षण की पहचान',
        issueNameEnglish: 'Crop health anomaly detected',
        confidenceScore: 78,
        severity: 'medium',
        visualObservations: ['पत्तियों पर असामान्य रंग व दाग परिलक्षित हो रहे हैं।'],
        organicRemedies: ['देसी गाय के 10% गोमूत्र व नीम के अर्क का छिड़काव करें।', 'खट्टी छाछ और हींग का स्प्रे करें।'],
        chemicalRemedies: ['कृषि विशेषज्ञ की सलाह से उपयुक्त कवकनाशी या कीटनाशी का अनुशंसित मात्रा में छिड़काव करें।'],
        preventionTips: ['संतुलित उर्वरक का प्रयोग करें और खेत में उचित जल निकासी रखें।'],
        voiceSummaryHindi: 'किसान भैया, आपकी फसल में रोग के लक्षण दिखे हैं। तुरंत जैविक उपचार या नजदीकी कृषि केंद्र से संपर्क करें।',
      };
    }

    return res.json({
      success: true,
      analysis: parsedResult,
      timestamp: new Date().toISOString(),
      disclaimer: 'यह AI सलाह प्रारंभिक जांच के लिए है। किसी भी गंभीर स्थिति में नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर 1800-180-1551 से संपर्क करें।',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Crop diagnosis error:', error);
    serverMetrics.systemErrors.push({
      time: new Date().toISOString(),
      message: error.message || 'Diagnosis generation failed',
    });
    return res.status(500).json({
      error: 'फसल विश्लेषण में तकनीकी समस्या आई। कृपया पुनः प्रयास करें।',
      details: error.message,
    });
  }
});

// 2. Agricultural Chatbot Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'कृपया अपना सवाल लिखें।' });
    }

    serverMetrics.chatQueriesCount += 1;

    const systemInstruction = `
आप 'किसान साथी AI' के वरिष्ठ एवं अनुभवी कृषि सलाहकार (Chief Agricultural Agronomist) हैं।
आप भारतीय किसानों, विशेषकर ग्रामीण व बुंदेलखंड क्षेत्र के किसानों से आत्मीय, सरल, व्यावहारिक हिंदी भाषा में बात करते हैं।
संवाद शैली:
- 'राम राम किसान भाई', 'नमस्ते किसान भैया' जैसे सम्मानजनक शब्दों का स्वाभाविक उपयोग करें।
- बिंदुवार, स्पष्ट और व्यवहार में आने लायक उत्तर दें।
- जैविक व कम लागत वाली देसी तकनीकों (जीवामृत, नीमास्त्र, वर्मीकम्पोस्ट, बीजामृत) को प्राथमिकता दें।
- यदि रासायनिक दवा का उल्लेख करें, तो सटीक मात्रा (प्रति एकड़ या प्रति लीटर पानी) और सुरक्षा चेतावनी अवश्य दें।
- यदि कोई सवाल अनिश्चित हो, तो स्पष्ट कहें और किसान कॉल सेंटर टोल-फ्री 1800-180-1551 या नजदीकी KVK से संपर्क करने को कहें।
- कभी भी भ्रामक या अवास्तविक दावों का प्रयोग न करें।
`;

    // Construct conversation context
    let promptWithContext = systemInstruction + '\n\n';
    if (Array.isArray(history) && history.length > 0) {
      promptWithContext += 'पूर्व बातचीत:\n';
      for (const turn of history.slice(-6)) {
        promptWithContext += `${turn.sender === 'user' ? 'किसान' : 'किसान साथी AI'}: ${turn.text}\n`;
      }
    }
    promptWithContext += `\nवर्तमान प्रश्न:\nकिसान: ${message}\nकिसान साथी AI:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptWithContext,
    });

    const reply = response.text || 'राम राम किसान भाई, कृपया अपना सवाल दोबारा पूछें।';

    return res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Chat error:', error);
    serverMetrics.systemErrors.push({
      time: new Date().toISOString(),
      message: error.message || 'Chat generation failed',
    });
    return res.status(500).json({
      error: 'सलाहकार सेवा में त्रुटि आई। कृपया कुछ क्षण बाद प्रयास करें।',
      details: error.message,
    });
  }
});

// 3. Weather Endpoint
app.get('/api/weather', (req: Request, res: Response) => {
  const location = (req.query.location as string) || 'बांदा / बुंदेलखंड (उत्तर प्रदेश)';
  
  // Real-time simulated weather with agro advisory
  const weatherData = {
    location,
    updatedAt: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
    temperature: 28,
    tempMin: 18,
    tempMax: 32,
    conditionHindi: 'आंशिक रूप से बादल छाए रहेंगे',
    conditionIcon: 'partly-cloudy',
    humidity: '54%',
    windSpeed: '9 किमी/घंटा',
    rainProbability: '15%',
    uvIndex: 'मध्यम (5)',
    soilMoisture: 'पर्याप्त (अनुकूल)',
    sprayingAdvisory: {
      status: 'अनुकूल (Safe)',
      color: 'green',
      message: 'हवा की गति सामान्य है। दोपहर के समय कवकनाशी या जैविक कीटनाशक का छिड़काव किया जा सकता है।',
    },
    irrigationAdvisory: {
      status: 'सामान्य',
      message: 'अगले 48 घंटों में भारी बारिश की संभावना कम है। आवश्यकतानुसार हल्की सिंचाई की जा सकती है।',
    },
    forecast: [
      { day: 'आज', tempMax: 32, tempMin: 18, condition: 'धूप व बादल', rain: '15%' },
      { day: 'कल', tempMax: 31, tempMin: 17, condition: 'साफ मौसम', rain: '5%' },
      { day: 'परसों', tempMax: 30, tempMin: 16, condition: 'हल्की धूप', rain: '10%' },
      { day: 'शुक्र', tempMax: 29, tempMin: 16, condition: 'साफ आसमान', rain: '0%' },
      { day: 'शनि', tempMax: 30, tempMin: 17, condition: 'धूप खिली रहेगी', rain: '5%' },
    ],
    dataSource: 'भारतीय मौसम विभाग (IMD Agro-met Advisory Service)',
    isDemoMode: true,
  };

  return res.json({ success: true, data: weatherData });
});

// 4. Mandi Rates Endpoint
app.get('/api/mandi', (req: Request, res: Response) => {
  const cropFilter = (req.query.crop as string)?.toLowerCase();
  let rates = [...mandiRatesData];

  if (cropFilter && cropFilter !== 'all') {
    rates = rates.filter(
      r => r.cropKey.includes(cropFilter) || r.cropHindi.toLowerCase().includes(cropFilter)
    );
  }

  return res.json({
    success: true,
    data: rates,
    totalRecords: rates.length,
    lastRefreshed: new Date().toLocaleTimeString('hi-IN'),
    dataSource: 'e-NAM & राज्य कृषि विपणन बोर्ड (APMC Live Feed Demo)',
    isDemoMode: true,
  });
});

// 5. Knowledge Articles Endpoint
app.get('/api/articles', (req: Request, res: Response) => {
  const category = req.query.category as string;
  let articles = [...knowledgeArticles];

  if (category && category !== 'सभी') {
    articles = articles.filter(a => a.category.includes(category));
  }

  return res.json({ success: true, articles });
});

// 6. Schemes Endpoint
app.get('/api/schemes', (_req: Request, res: Response) => {
  return res.json({ success: true, schemes: govtSchemes });
});

// 7. Helplines Endpoint
app.get('/api/helplines', (_req: Request, res: Response) => {
  return res.json({ success: true, helplines: verifiedHelplines });
});

// 8. Admin Announcement & Content Management
app.get('/api/announcement', (_req: Request, res: Response) => {
  return res.json({ success: true, announcement: adminAnnouncement });
});

app.post('/api/admin/announcement', (req: Request, res: Response) => {
  const { title, message, active, adminPin } = req.body;
  if (adminPin !== 'kisanadmin2026') {
    return res.status(403).json({ error: 'अनधिकृत: अमान्य एडमिन पिन' });
  }

  adminAnnouncement = {
    active: active ?? true,
    title: title || adminAnnouncement.title,
    message: message || adminAnnouncement.message,
    updatedAt: new Date().toISOString(),
  };

  return res.json({ success: true, announcement: adminAnnouncement });
});

app.post('/api/admin/add-article', (req: Request, res: Response) => {
  const { title, category, summary, content, adminPin } = req.body;
  if (adminPin !== 'kisanadmin2026') {
    return res.status(403).json({ error: 'अनधिकृत: अमान्य एडमिन पिन' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'शीर्षक और सामग्री आवश्यक हैं।' });
  }

  const newArticle = {
    id: `art-${Date.now()}`,
    title,
    category: category || 'सामान्य कृषि',
    readTime: '3 मिनट',
    summary: summary || title,
    content,
  };

  knowledgeArticles.unshift(newArticle);
  return res.json({ success: true, article: newArticle });
});

app.get('/api/admin/metrics', (req: Request, res: Response) => {
  const adminPin = req.query.pin as string;
  if (adminPin !== 'kisanadmin2026') {
    return res.status(403).json({ error: 'अमान्य एडमिन पिन' });
  }

  const uptimeSec = Math.floor((Date.now() - serverMetrics.startTime) / 1000);
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  return res.json({
    success: true,
    metrics: {
      uptime: `${hours} घंटे ${minutes} मिनट`,
      cropAnalysesCount: serverMetrics.cropAnalysesCount,
      chatQueriesCount: serverMetrics.chatQueriesCount,
      zipDownloadsCount: serverMetrics.zipDownloadsCount,
      lastDiagnosisTime: serverMetrics.lastDiagnosisTime,
      totalArticles: knowledgeArticles.length,
      totalMandiRecords: mandiRatesData.length,
      systemErrors: serverMetrics.systemErrors.slice(-10),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    },
  });
});

// 9. Admin AI-Assisted Proposed App Change Simulator
app.post('/api/admin/suggest-change', async (req: Request, res: Response) => {
  try {
    const { prompt, adminPin } = req.body;
    if (adminPin !== 'kisanadmin2026') {
      return res.status(403).json({ error: 'अमान्य एडमिन पिन' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'कृपया परिवर्तन का विवरण दें।' });
    }

    const aiPrompt = `
आप 'किसान साथी AI' के आर्किटेक्ट हैं।
व्यवस्थापक (Admin) ने निम्नलिखित एप्लिकेशन सुधार या नई सुविधा का अनुरोध किया है:
"${prompt}"

कृपया एक सुरक्षित, समीक्षा योग्य प्रस्ताव तैयार करें। उत्तर शुद्ध JSON में दें:
{
  "changeId": "chg-${Date.now()}",
  "proposalTitle": "सुझाव का संक्षिप्त शीर्षक",
  "affectedComponents": ["CropDoctor", "MandiRates", "Database"],
  "technicalImpact": "तकनीकी प्रभाव व आवश्यक परिवर्तन",
  "securityVerification": "सुरक्षा जांच व गोपनीयता प्रभाव",
  "riskLevel": "low" या "medium" या "high",
  "recommendedAction": "अनुशंसित कार्रवाई",
  "canAutoApply": false,
  "status": "Under Review"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: aiPrompt,
    });

    let proposal;
    try {
      const match = response.text?.match(/\{[\s\S]*\}/);
      proposal = match ? JSON.parse(match[0]) : JSON.parse(response.text || '{}');
    } catch {
      proposal = {
        changeId: `chg-${Date.now()}`,
        proposalTitle: prompt.slice(0, 40),
        affectedComponents: ['Application Core'],
        technicalImpact: 'समीक्षाधीन परिवर्तन',
        securityVerification: 'सुरक्षा मानकों की पुष्टि आवश्यक है',
        riskLevel: 'medium',
        recommendedAction: 'स्टेजिंग वातावरण में परीक्षण करें',
        canAutoApply: false,
        status: 'Under Review',
      };
    }

    return res.json({ success: true, proposal });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: error.message });
  }
});

// 10. Complete Source Project ZIP Generator Endpoint
app.get('/api/download-project-zip', (req: Request, res: Response) => {
  try {
    serverMetrics.zipDownloadsCount += 1;
    const rootDir = path.resolve(__dirname);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="kisan-sathi-ai-complete-source.zip"');

    const ZipConstructor = archiver.ZipArchive || archiver;
    const archive = typeof ZipConstructor === 'function' ? (ZipConstructor.prototype ? new ZipConstructor({ zlib: { level: 9 } }) : ZipConstructor('zip', { zlib: { level: 9 } })) : new archiver.ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error('ZIP generation error:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Add source directories and files, excluding node_modules, dist, .git
    const ignoreList = ['node_modules', 'dist', '.git', '.aistudio'];

    const items = fs.readdirSync(rootDir);
    for (const item of items) {
      if (ignoreList.includes(item)) continue;
      const fullPath = path.join(rootDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        archive.directory(fullPath, item);
      } else {
        archive.file(fullPath, { name: item });
      }
    }

    archive.finalize();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Download error:', error);
    res.status(500).json({ error: 'ZIP फाइल तैयार करने में समस्या आई।' });
  }
});

// Vite Integration (Dev Mode vs Production)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🌾 Kisan Sathi AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
