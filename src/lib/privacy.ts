/**
 * The privacy policy shown in the footer's pop-up (GDPR, Reg. UE 2016/679), in the six languages of the site.
 * {name} {address} {phone} are filled from the shop's settings. Reviewed wording is the owner's responsibility:
 * update it here if the services or the data change.
 */
export type PrivacySection = { h: string; p: string[] };
export type PrivacyDoc = { title: string; updated: string; intro: string; sections: PrivacySection[] };

const PROVIDERS = "Vercel (hosting), Supabase (database), Telegram (owner notifications), Google (Maps, Gmail), Groq / Google Gemini / OpenRouter / Cloudflare Workers AI";

export const PRIVACY: Record<string, PrivacyDoc> = {
  it: {
    title: "Informativa sulla privacy",
    updated: "Aggiornata il 10 ottobre 2026",
    intro: "Questa pagina spiega quali dati raccoglie il sito di {name}, perché, per quanto tempo e quali sono i tuoi diritti. Raccogliamo solo quello che serve, niente di più.",
    sections: [
      { h: "Chi tratta i tuoi dati", p: ["Titolare del trattamento è {name}, {address}. Telefono {phone}. Per qualsiasi richiesta sulla privacy puoi scriverci dal modulo «Scrivici» del sito."] },
      { h: "Quali dati raccogliamo", p: ["Prenotazioni e torte: nome, telefono, e-mail (facoltativa), cosa ordini, giorno e ora del ritiro, note.", "Messaggi: nome, e-mail e il testo che ci scrivi.", "Commenti: nome, testo, stelle, foto (facoltativa) ed e-mail (facoltativa, solo per avvisarti delle risposte).", "Statistiche: conteggi anonimi delle visite, senza profilazione e senza cookie di terze parti."] },
      { h: "Perché li usiamo", p: ["Per preparare e confermare i tuoi ordini e risponderti (art. 6.1.b GDPR).", "Per pubblicare i commenti che scegli di lasciare (art. 6.1.a, consenso).", "Per proteggere il sito da spam e abusi (art. 6.1.f, legittimo interesse).", "Non vendiamo i tuoi dati, non facciamo pubblicità mirata e non inviamo newsletter."] },
      { h: "Traduzione e intelligenza artificiale", p: ["I messaggi e i commenti possono essere tradotti automaticamente e controllati contro lo spam da servizi di intelligenza artificiale. Il testo viene usato solo per questo scopo."] },
      { h: "A chi li affidiamo", p: [`I dati sono trattati da fornitori che ci aiutano a far funzionare il sito: ${PROVIDERS}. Alcuni possono trovarsi fuori dall'UE: in quel caso il trasferimento avviene con le garanzie previste dal GDPR (clausole contrattuali standard).`] },
      { h: "Per quanto tempo", p: ["Prenotazioni: fino a 12 mesi. Messaggi ed e-mail: fino a 24 mesi. Commenti: finché restano pubblicati o finché non ci chiedi di toglierli."] },
      { h: "Cookie e memoria del browser", p: ["Non usiamo cookie di profilazione. Il sito salva nel tuo browser solo piccole preferenze (lingua, audio, i «mi piace» ai commenti). La mappa di Google Maps, quando la apri, può usare i propri cookie."] },
      { h: "I tuoi diritti", p: ["Puoi chiederci in ogni momento di vedere, correggere, cancellare o limitare i tuoi dati, opporti al trattamento, riceverli in un formato leggibile e ritirare il consenso. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it)."] },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Updated 10 October 2026",
    intro: "This page explains what data {name}'s website collects, why, for how long, and what your rights are. We collect only what we need — nothing more.",
    sections: [
      { h: "Who handles your data", p: ["The data controller is {name}, {address}. Phone {phone}. For any privacy request, write to us with the «Write to us» form on the site."] },
      { h: "What we collect", p: ["Orders and cakes: name, phone, e-mail (optional), what you order, pick-up day and time, notes.", "Messages: name, e-mail and the text you send us.", "Comments: name, text, stars, a photo (optional) and an e-mail (optional, only to tell you about replies).", "Statistics: anonymous visit counts, no profiling and no third-party cookies."] },
      { h: "Why we use it", p: ["To prepare and confirm your orders and to answer you (Art. 6.1.b GDPR).", "To publish the comments you choose to leave (Art. 6.1.a, consent).", "To protect the site from spam and abuse (Art. 6.1.f, legitimate interest).", "We never sell your data, show targeted ads or send newsletters."] },
      { h: "Translation and AI", p: ["Messages and comments may be translated automatically and checked for spam by AI services. The text is used only for that."] },
      { h: "Who we share it with", p: [`Data is processed by providers that help run the site: ${PROVIDERS}. Some may be outside the EU; transfers then rely on GDPR safeguards (standard contractual clauses).`] },
      { h: "How long we keep it", p: ["Orders: up to 12 months. Messages and e-mails: up to 24 months. Comments: as long as they are published or until you ask us to remove them."] },
      { h: "Cookies and browser storage", p: ["We use no profiling cookies. The site stores only small preferences in your browser (language, sound, the likes you gave). Google Maps may set its own cookies when you open the map."] },
      { h: "Your rights", p: ["You can ask us at any time to access, correct, delete or restrict your data, object to its use, receive it in a readable format and withdraw consent. You can also complain to the Italian data protection authority (garanteprivacy.it)."] },
    ],
  },
  pl: {
    title: "Polityka prywatności",
    updated: "Aktualizacja: 10 października 2026",
    intro: "Ta strona wyjaśnia, jakie dane zbiera strona {name}, po co, jak długo je przechowujemy i jakie masz prawa. Zbieramy tylko to, co potrzebne — nic więcej.",
    sections: [
      { h: "Kto przetwarza Twoje dane", p: ["Administratorem danych jest {name}, {address}. Telefon {phone}. W sprawach prywatności napisz do nas przez formularz «Napisz do nas» na stronie."] },
      { h: "Jakie dane zbieramy", p: ["Zamówienia i torty: imię, telefon, e-mail (opcjonalnie), co zamawiasz, dzień i godzina odbioru, uwagi.", "Wiadomości: imię, e-mail i treść, którą do nas piszesz.", "Komentarze: imię, treść, gwiazdki, zdjęcie (opcjonalnie) i e-mail (opcjonalnie, tylko żeby powiadomić o odpowiedzi).", "Statystyki: anonimowe liczniki odwiedzin, bez profilowania i bez cookies firm trzecich."] },
      { h: "Po co ich używamy", p: ["Żeby przygotować i potwierdzić zamówienie oraz Ci odpowiedzieć (art. 6 ust. 1 lit. b RODO).", "Żeby opublikować komentarz, który zostawiasz (art. 6 ust. 1 lit. a, zgoda).", "Żeby chronić stronę przed spamem i nadużyciami (art. 6 ust. 1 lit. f, prawnie uzasadniony interes).", "Nie sprzedajemy danych, nie wyświetlamy reklam targetowanych i nie wysyłamy newsletterów."] },
      { h: "Tłumaczenie i sztuczna inteligencja", p: ["Wiadomości i komentarze mogą być automatycznie tłumaczone i sprawdzane pod kątem spamu przez usługi AI. Tekst jest używany tylko w tym celu."] },
      { h: "Komu je powierzamy", p: [`Dane przetwarzają dostawcy, dzięki którym działa strona: ${PROVIDERS}. Niektórzy mogą być poza UE — wtedy przekazanie odbywa się z zabezpieczeniami RODO (standardowe klauzule umowne).`] },
      { h: "Jak długo", p: ["Zamówienia: do 12 miesięcy. Wiadomości i e-maile: do 24 miesięcy. Komentarze: dopóki są opublikowane lub do Twojej prośby o usunięcie."] },
      { h: "Cookies i pamięć przeglądarki", p: ["Nie używamy cookies profilujących. Strona zapisuje w przeglądarce tylko drobne ustawienia (język, dźwięk, Twoje polubienia). Mapa Google po otwarciu może używać własnych cookies."] },
      { h: "Twoje prawa", p: ["W każdej chwili możesz poprosić o dostęp do danych, ich poprawienie, usunięcie lub ograniczenie, sprzeciwić się przetwarzaniu, otrzymać je w czytelnym formacie i wycofać zgodę. Możesz też złożyć skargę do włoskiego organu ochrony danych (garanteprivacy.it) lub do PUODO."] },
    ],
  },
  es: {
    title: "Política de privacidad",
    updated: "Actualizada el 10 de octubre de 2026",
    intro: "Aquí te contamos qué datos recoge la web de {name}, para qué, durante cuánto tiempo y cuáles son tus derechos. Solo recogemos lo necesario.",
    sections: [
      { h: "Quién trata tus datos", p: ["El responsable del tratamiento es {name}, {address}. Teléfono {phone}. Para cualquier consulta de privacidad, escríbenos desde el formulario «Escríbenos»."] },
      { h: "Qué datos recogemos", p: ["Reservas y tartas: nombre, teléfono, e-mail (opcional), qué pides, día y hora de recogida, notas.", "Mensajes: nombre, e-mail y el texto que nos escribes.", "Comentarios: nombre, texto, estrellas, foto (opcional) y e-mail (opcional, solo para avisarte de respuestas).", "Estadísticas: recuentos anónimos de visitas, sin perfiles ni cookies de terceros."] },
      { h: "Para qué los usamos", p: ["Para preparar y confirmar tus pedidos y responderte (art. 6.1.b RGPD).", "Para publicar los comentarios que decides dejar (art. 6.1.a, consentimiento).", "Para proteger la web del spam y abusos (art. 6.1.f, interés legítimo).", "No vendemos tus datos, no hacemos publicidad dirigida ni enviamos newsletters."] },
      { h: "Traducción e inteligencia artificial", p: ["Los mensajes y comentarios pueden traducirse automáticamente y revisarse contra el spam con servicios de IA, solo con ese fin."] },
      { h: "Con quién los compartimos", p: [`Los tratan proveedores que hacen funcionar la web: ${PROVIDERS}. Algunos pueden estar fuera de la UE; en ese caso se aplican las garantías del RGPD (cláusulas contractuales tipo).`] },
      { h: "Cuánto tiempo", p: ["Reservas: hasta 12 meses. Mensajes y e-mails: hasta 24 meses. Comentarios: mientras estén publicados o hasta que pidas retirarlos."] },
      { h: "Cookies y memoria del navegador", p: ["No usamos cookies de perfilado. La web guarda en tu navegador solo pequeñas preferencias (idioma, sonido, tus «me gusta»). Google Maps puede usar sus propias cookies al abrir el mapa."] },
      { h: "Tus derechos", p: ["Puedes pedirnos en cualquier momento acceder, corregir, borrar o limitar tus datos, oponerte, recibirlos en un formato legible y retirar el consentimiento. También puedes reclamar ante la autoridad italiana de protección de datos (garanteprivacy.it)."] },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    updated: "Stand: 10. Oktober 2026",
    intro: "Hier erfährst du, welche Daten die Website von {name} erhebt, wozu, wie lange und welche Rechte du hast. Wir erheben nur, was nötig ist.",
    sections: [
      { h: "Wer deine Daten verarbeitet", p: ["Verantwortlich ist {name}, {address}. Telefon {phone}. Für Datenschutzanfragen schreib uns über das Formular «Schreib uns»."] },
      { h: "Welche Daten wir erheben", p: ["Bestellungen und Torten: Name, Telefon, E-Mail (optional), Bestellung, Abholtag und -zeit, Notizen.", "Nachrichten: Name, E-Mail und dein Text.", "Kommentare: Name, Text, Sterne, Foto (optional) und E-Mail (optional, nur für Benachrichtigungen über Antworten).", "Statistik: anonyme Besuchszahlen, ohne Profilbildung und ohne Cookies Dritter."] },
      { h: "Wozu wir sie nutzen", p: ["Um deine Bestellung vorzubereiten, zu bestätigen und dir zu antworten (Art. 6 Abs. 1 lit. b DSGVO).", "Um Kommentare zu veröffentlichen, die du hinterlässt (Art. 6 Abs. 1 lit. a, Einwilligung).", "Zum Schutz vor Spam und Missbrauch (Art. 6 Abs. 1 lit. f, berechtigtes Interesse).", "Wir verkaufen keine Daten, schalten keine personalisierte Werbung und verschicken keine Newsletter."] },
      { h: "Übersetzung und KI", p: ["Nachrichten und Kommentare können automatisch übersetzt und von KI-Diensten auf Spam geprüft werden – nur zu diesem Zweck."] },
      { h: "Empfänger", p: [`Verarbeitet von Dienstleistern, die die Website betreiben: ${PROVIDERS}. Manche sitzen außerhalb der EU; dann gelten die Garantien der DSGVO (Standardvertragsklauseln).`] },
      { h: "Speicherdauer", p: ["Bestellungen: bis zu 12 Monate. Nachrichten und E-Mails: bis zu 24 Monate. Kommentare: solange sie veröffentlicht sind oder bis du die Löschung verlangst."] },
      { h: "Cookies und Browserspeicher", p: ["Keine Tracking-Cookies. Die Website speichert nur kleine Einstellungen in deinem Browser (Sprache, Ton, deine Likes). Google Maps kann beim Öffnen der Karte eigene Cookies setzen."] },
      { h: "Deine Rechte", p: ["Du kannst jederzeit Auskunft, Berichtigung, Löschung oder Einschränkung verlangen, widersprechen, deine Daten in lesbarem Format erhalten und Einwilligungen widerrufen. Beschwerden sind bei der italienischen Datenschutzbehörde möglich (garanteprivacy.it)."] },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "Mise à jour le 10 octobre 2026",
    intro: "Cette page explique quelles données le site de {name} collecte, pourquoi, combien de temps et quels sont tes droits. Nous ne collectons que l'essentiel.",
    sections: [
      { h: "Qui traite tes données", p: ["Le responsable du traitement est {name}, {address}. Téléphone {phone}. Pour toute demande, écris-nous via le formulaire «Écris-nous»."] },
      { h: "Quelles données", p: ["Commandes et gâteaux : nom, téléphone, e-mail (facultatif), ta commande, jour et heure de retrait, remarques.", "Messages : nom, e-mail et ton texte.", "Commentaires : nom, texte, étoiles, photo (facultative) et e-mail (facultatif, seulement pour t'avertir d'une réponse).", "Statistiques : nombre de visites anonyme, sans profilage ni cookies tiers."] },
      { h: "Pourquoi", p: ["Pour préparer et confirmer ta commande et te répondre (art. 6.1.b RGPD).", "Pour publier les commentaires que tu laisses (art. 6.1.a, consentement).", "Pour protéger le site du spam et des abus (art. 6.1.f, intérêt légitime).", "Nous ne vendons pas tes données, pas de publicité ciblée, pas de newsletter."] },
      { h: "Traduction et IA", p: ["Les messages et commentaires peuvent être traduits automatiquement et vérifiés contre le spam par des services d'IA, uniquement à cette fin."] },
      { h: "Destinataires", p: [`Traitées par les prestataires qui font fonctionner le site : ${PROVIDERS}. Certains peuvent être hors UE ; les transferts reposent alors sur les garanties du RGPD (clauses contractuelles types).`] },
      { h: "Durée de conservation", p: ["Commandes : jusqu'à 12 mois. Messages et e-mails : jusqu'à 24 mois. Commentaires : tant qu'ils sont publiés ou jusqu'à ta demande de retrait."] },
      { h: "Cookies et stockage du navigateur", p: ["Aucun cookie de profilage. Le site garde seulement de petites préférences dans ton navigateur (langue, son, tes j'aime). Google Maps peut déposer ses propres cookies quand tu ouvres la carte."] },
      { h: "Tes droits", p: ["Tu peux à tout moment demander l'accès, la rectification, l'effacement ou la limitation de tes données, t'opposer, les recevoir dans un format lisible et retirer ton consentement. Tu peux aussi saisir l'autorité italienne (garanteprivacy.it)."] },
    ],
  },
};
