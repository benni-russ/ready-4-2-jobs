// Bundled knowledge articles, see de.js.
(function () {
  "use strict";
  var liste = (window.R42J_WISSEN = window.R42J_WISSEN || []);

  // Quellen und Skizze je Artikel. Die Quellen wurden abgerufen und geprüft.
  var ZUSATZ = {
    "foto-ja-nein": {
      "sources": "EURES (European Commission): Living and working conditions in Germany, applications and photo | https://eures.europa.eu/living-and-working/living-and-working-conditions/living-and-working-conditions-germany_en ;; University of St Andrews Careers: CVs, no photo on UK CVs | https://www.st-andrews.ac.uk/careers/how-to-apply/cv/ ;; Pomona College Career Development: U.S. résumé tips for international students | https://cdo.pomona.edu/resources/u-s-resume-tips-for-international-students/",
      "image": "foto-ja-nein",
      "imageAlt": "Comparison of when a photo helps and when to leave it out"
    },
    "ats-erklaert": {
      "sources": "Roche Careers: Resume parsing FAQ | https://careers.roche.com/global/en/resume-parsing-faq ;; UC Irvine Career Center: Mastering ATS career guide | https://career.uci.edu/wp-content/uploads/2025/03/2025-Mastering-ATS-Career-Guide-8.5x11.pdf",
      "image": "ats-erklaert",
      "imageAlt": "Flow: upload the application, software reads the text, skills are found, people decide"
    },
    "star-methode": {
      "sources": "MIT Career Advising: Career toolkit for interviewing | https://capd.mit.edu/resources/career-toolkit-interviewing/ ;; University of Washington Career Center: STAR method of interviewing | https://careers.uw.edu/resources/star-method-of-interviewing/",
      "image": "star-methode",
      "imageAlt": "Four steps: situation, task, action and result"
    },
    "anschreiben-aufbau": {
      "sources": "EURES (European Commission): Applying for a job in Germany, cover letter and CV | https://eures.europa.eu/living-and-working/living-and-working-conditions/living-and-working-conditions-germany_en ;; DIN Media: DIN 5008 topic page | https://www.dinmedia.de/en/topics/din-5008",
      "image": "anschreiben-aufbau",
      "imageAlt": "Page with sender, subject, opening, main part, closing and signature"
    },
    "gehaltsverhandlung": {
      "sources": "MIT Career Advising: Negotiate job offers | https://capd.mit.edu/channels/negotiate-job-offers/ ;; University of Pennsylvania Career Services: Negotiating salary and evaluating an offer | https://careerservices.upenn.edu/blog/2019/08/19/negotiating-salary/ ;; German Federal Employment Agency: Entgeltatlas salary tool (in German) | https://web.arbeitsagentur.de/entgeltatlas/",
      "image": "gehaltsverhandlung",
      "imageAlt": "Range of minimum, target and wish"
    },
    "kuendigungsfristen": {
      "sources": "Gesetze im Internet: German Civil Code in English, sections 622 and 623 (status 2021) | https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html ;; EURES (European Commission): Germany, employment contracts and end of employment | https://eures.europa.eu/living-and-working/living-and-working-conditions/living-and-working-conditions-germany_en",
      "image": "kuendigungsfristen",
      "imageAlt": "Staircase: after 2, 5, 8, 10, 12, 15 and 20 years notice rises from 1 to 7 months"
    },
    "arbeitsvertrag-pruefen": {
      "sources": "EURES (European Commission): Germany, employment contracts | https://eures.europa.eu/living-and-working/living-and-working-conditions/living-and-working-conditions-germany_en ;; Gesetze im Internet: German Commercial Code in English, sections 74 and 74a | https://www.gesetze-im-internet.de/englisch_hgb/englisch_hgb.html ;; Gesetze im Internet: Section 2 Nachweisgesetz, written record of terms (in German) | https://www.gesetze-im-internet.de/nachwg/__2.html",
      "image": "arbeitsvertrag-pruefen",
      "imageAlt": "Contract page with role, pay, hours, holiday, probation and notice periods"
    },
    "vorstellungsgespraech": {
      "sources": "Federal Anti-Discrimination Agency: Inadmissible questions in job interviews | https://www.antidiskriminierungsstelle.gov.de/SharedDocs/pressemitteilungen/EN/2018/20181205_Unangemessene_Fragen_Bewerbungsgespraeche.html ;; Gesetze im Internet: General Equal Treatment Act in English | https://www.gesetze-im-internet.de/englisch_agg/englisch_agg.html ;; MIT Career Advising: Career toolkit for interviewing | https://capd.mit.edu/resources/career-toolkit-interviewing/",
      "image": "vorstellungsgespraech",
      "imageAlt": "Five phases: arrive, introduce, questions, your turn and close"
    },
    "linkedin-xing-profil": {
      "sources": "LinkedIn Help: Create a good LinkedIn profile | https://www.linkedin.com/help/linkedin/answer/a554351 ;; LinkedIn Help: Let recruiters know you're Open to Work | https://www.linkedin.com/help/linkedin/answer/a507508/let-recruiters-know-you-re-open-to-work?lang=en ;; LinkedIn Help: Edit your headline | https://www.linkedin.com/help/linkedin/answer/a542926/edit-your-headline?lang=en",
      "image": "linkedin-xing-profil",
      "imageAlt": "Profile with photo, headline, summary, experience and skills"
    },
    "serioese-email": {
      "sources": "CISA: Turn on multifactor authentication | https://www.cisa.gov/secure-our-world/turn-mfa ;; University of Duisburg-Essen Career Service: Applying by email (in German) | https://www.uni-due.de/imperia/md/content/abz/career/bewerbung_permail_barrierefrei.pdf",
      "image": "serioese-email",
      "imageAlt": "Examples of professional and unsuitable email addresses"
    },
    "probezeit": {
      "sources": "Gesetze im Internet: German Civil Code in English, section 622 (status 2021) | https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html ;; EURES (European Commission): Germany, probation and notice periods | https://eures.europa.eu/living-and-working/living-and-working-conditions/living-and-working-conditions-germany_en ;; Gesetze im Internet: Section 1 Protection Against Dismissal Act (in German) | https://www.gesetze-im-internet.de/kschg/__1.html",
      "image": "probezeit",
      "imageAlt": "Timeline: up to six months usually two weeks' notice, longer periods afterwards"
    }
  };

  function zusatzZeilen(kennung) {
    var z = ZUSATZ[kennung];
    return z ? "sources: " + z.sources + "\nimage: " + z.image + "\nimage-alt: " + z.imageAlt + "\n" : "";
  }

  function artikel(kennung, titel, kategorie, text) {
    liste.push({
      datei: kennung + ".en.md",
      md: "---\ntitle: " + titel + "\ncategory: " + kategorie + "\nlang: en\n" + zusatzZeilen(kennung) + "---\n\n" + text.trim() + "\n",
    });
  }

  var BEWERBUNG = "Applying";
  var RECHT = "Contract and law";
  var GESPRAECH = "Interview";
  var AUFTRITT = "Online presence";

  artikel("foto-ja-nein", "Photo or no photo?", BEWERBUNG, `
In Germany, a photo on your CV is common, but no law requires it. It is voluntary, and you may leave it out.

## When a photo helps

- at small and medium-sized companies in Germany
- in jobs with a lot of customer contact
- when your photo looks professional and is recent

## When to leave it out

- when applying in English-speaking countries, especially the US and UK
- at international companies that ask for anonymous documents
- when all you have is a holiday or photo booth picture

## What to look out for

Choose a calm picture with a neutral background and suitable clothing. Look into the camera with a friendly expression. Selfies and crops from group photos look out of place.

> R42J adds the photo to German applications automatically. You can turn it off per application.
`);

  artikel("ats-erklaert", "What is an ATS?", BEWERBUNG, `
ATS stands for applicant tracking system. Many companies store applications in one. The software reads your CV and makes it searchable, so recruiters can look for a specific skill, for example.

## What this means for your CV

- **Single column:** Columns mix up the reading order.
- **Real text:** Software cannot read text inside images.
- **Clear headings:** "Work experience" is recognized, a play on words is not.
- **Terms from the job ad:** Name skills the way the ad does, as long as they apply to you.
- **No tables or text boxes** for important details.

## How to check it yourself

Open the PDF, select everything and paste the text into an editor. If it appears in the right order, software can read it as well.

> The R42J CV template follows these rules.
`);

  artikel("star-methode", "The STAR method", GESPRAECH, `
The STAR method helps you answer questions like "Tell me about a difficult situation". You tell a real example in four steps and keep it short and specific.

## The four steps

| Step | Question | Share |
| --- | --- | --- |
| Situation | Where and when was it? | short |
| Task | What was your job? | short |
| Action | What did you do yourself? | most of it |
| Result | What came of it? | short, ideally with a number |

## An example

- **Situation:** Before Christmas, customer service requests were piling up.
- **Task:** I was asked to reduce the waiting time.
- **Action:** I analyzed the most common questions and wrote reply templates.
- **Result:** Within two weeks, the waiting time fell from three days to one.

## Tips

Say "I" instead of "we", because the question is about your contribution. Prepare four to six examples that work for different questions. Say them out loud, the training under "Preparation" helps with that.
`);

  artikel("anschreiben-aufbau", "How to structure a cover letter", BEWERBUNG, `
A cover letter fits on one page. It does not repeat your CV. It explains why you and this job are a good match.

## The structure

1. **Opening:** Why this job, why this company? Skip phrases like "I am writing to apply".
2. **Motivation:** What attracts you to the role?
3. **Match:** Take two or three requirements from the ad and back them up with examples.
4. **Added value:** What do you bring that others may not?
5. **Practical details:** Start date and, if requested, salary expectations.
6. **Closing:** Say that you look forward to an interview.

## What to look out for

- Address a person by name if you can find out who it is.
- Write short sentences and avoid empty phrases like "team player" without proof.
- Check the company name and job title twice.
- Ask someone to proofread it.
`);

  artikel("gehaltsverhandlung", "Negotiating your salary", GESPRAECH, `
Salary negotiations are normal. Asking politely and with good preparation will rarely cost you an offer.

## Preparation

- **Check the market:** Compare salaries for your job and region, for example in the salary atlas of the German Federal Employment Agency.
- **Prove your value:** Collect achievements with numbers.
- **Set a range:** Decide on your wish, target and minimum before the conversation.
- **Think in gross per year:** Companies usually talk about annual gross salary.

## In the conversation

Name a specific figure or a narrow range and justify it with your experience, not your expenses. Allow a short pause after naming the figure. Wait for the reaction before you soften it.

## More than the base salary

Compare the whole package: bonus, vacation days, home office, travel costs, company pension and training. Under "Comparison" you can put offers side by side.

Put the result in the contract. Verbal promises are hard to prove later.
`);

  artikel("kuendigungsfristen", "Notice periods", RECHT, `
This article gives an overview for employment in Germany. It does not replace legal advice. For specific questions, contact a trade union or an employment lawyer.

## The basic legal rule

Under Section 622 of the German Civil Code (BGB), the notice period is four weeks to the 15th or the end of a calendar month. For employees, this applies regardless of length of service.

## Notice given by the company

The period grows with length of service, each time to the end of a month:

| Employed for | Notice |
| --- | --- |
| 2 years | 1 month |
| 5 years | 2 months |
| 8 years | 3 months |
| 10 years | 4 months |
| 12 years | 5 months |
| 15 years | 6 months |
| 20 years | 7 months |

## What to look out for

- **Contract:** Longer periods are possible, but never longer for you than for the employer. Shorter ones are allowed only in narrow exceptions (Section 622(5) and (6) BGB).
- **Collective agreement:** It can set different periods.
- **Probation:** Two weeks usually apply here, see [Probation](#/wissen/probezeit).
- **Written form:** Notice must be on paper with a signature. Email or messengers are not enough.
- **Count backwards:** Before accepting, check the earliest date you can switch jobs.
`);

  artikel("arbeitsvertrag-pruefen", "Checking your employment contract", RECHT, `
Read the whole contract before you sign. You may take your time and ask questions. This overview applies to Germany and does not replace legal advice.

## The most important points

- **Does everything match the offer?** Salary, hours, vacation, place of work, start date.
- **Probation:** Up to six months is common. See [Probation](#/wissen/probezeit).
- **Notice period:** It is in the contract or follows the law, see [Notice periods](#/wissen/kuendigungsfristen).
- **Overtime:** Clauses like "covered by your salary" are problematic if it is unclear how many hours are meant.
- **Fixed term:** The end date or purpose must be agreed in writing before you start.
- **Non-compete after leaving:** It lasts two years at most and requires compensation of at least half of your last pay.
- **Repaying training costs:** Check the amount and the commitment period.
- **Transfer:** Check whether the company may send you to other locations or tasks.

## If something is unclear

Ask in writing and request a change to the contract. If in doubt, trade unions and employment lawyers can review the contract. Under "Comparison" you will find a checklist for each offer.
`);

  artikel("vorstellungsgespraech", "The job interview", GESPRAECH, `
An interview is not an exam. It is a chance to get to know each other. You also find out whether the job suits you.

## Preparation

- Reread the job ad and your own application.
- Find out about the company, its products and recent news.
- Prepare a short introduction of about two minutes.
- Practice examples with the [STAR method](#/wissen/star-methode).
- Write down your own questions, for example about onboarding or the team.

## Typical structure

1. Welcome and introductions
2. Introduction of the company and the job
3. Your background and examples
4. Your questions
5. Salary, start date and next steps

## On the day

Allow time for the journey and arrive about ten minutes early. For a video interview, test your camera, sound and connection beforehand and choose a quiet place.

## Inadmissible questions

In Germany, questions about pregnancy, family planning or religion are generally not allowed. You do not have to answer them truthfully.

## Afterwards

Note right away what went well and what you want to follow up on. A short thank-you email on the same or next day is a good finish.
`);

  artikel("linkedin-xing-profil", "LinkedIn and XING profile", AUFTRITT, `
Many recruiters look at online profiles. A well-kept profile supports your application, an outdated one hurts it.

## The basics

- **Photo:** friendly, recent and right for your field
- **Headline:** what you do and look for, not just your current job
- **Summary:** three to five sentences on strengths and goals
- **Experience:** the same dates and titles as in your CV
- **Skills:** terms people search for in your field

## What to check

1. Do dates and titles match your CV?
2. Are there any spelling mistakes?
3. Do earlier posts and comments still look right?
4. Is the "open to work" setting the way you want it? Check whether your current employer can see it.

## One profile is enough

Keep one profile in good shape rather than two in bad shape. If you no longer use one, delete it or point to your active profile.
`);

  artikel("serioese-email", "A professional email address", AUFTRITT, `
Your email address is often the first thing a company sees from you. It should be plain and contain your name.

## What it looks like

- good: firstname.lastname@example.com
- also good: f.lastname@example.com
- unsuitable: nicknames, birth years or made-up names

## A separate inbox for applications

Set up a separate inbox. That way, replies do not get lost between newsletters, and you keep track.

## What to look out for

- Never use your current employer's address.
- Check your spam folder regularly.
- Turn on two-factor sign-in if your provider offers it.
- The sender name shown is your full name.
`);

  artikel("probezeit", "Probation", RECHT, `
During probation, you and the company get to know each other. This overview applies to Germany and does not replace legal advice.

## The essentials

- **Length:** A shortened notice period may be agreed for six months at most (Section 622 (3) BGB).
- **Notice:** During this time, two weeks are usually enough, to any day and for both sides.
- **Not automatic:** Probation only applies if it is in the contract. It can also be shorter.
- **Fixed-term contracts:** Probation must be proportionate to the term and the work.

## Probation and dismissal protection

These are two separate things. General protection against dismissal applies in companies with more than ten employees after six months at the company, regardless of the agreed probation.

## Your rights

During probation you are still entitled to pay, sick pay (after four weeks of employment) and pro rata vacation.

## How to use the time

Ask for feedback early and clarify expectations. Arrange a review after about three months.

R42J records in the statistics when you pass probation: Set the status of the application to do this.
`);

  artikel("erste-schritte", "Getting started", "Getting started", `
How to get from first launch to your first application.

## 1. Start

- **Windows:** double-click \`Start (Windows).cmd\`.
- **Mac:** right-click \`Start (Mac).command\`, choose “Open” and confirm the security question. You only need this the first time. If the Mac does not offer this, System Settings → Privacy & Security has an “Open Anyway” button.
- **If neither works:** right-click \`Start.html\` and open it in Chrome or Edge.

R42J only runs in Chrome and Edge.

## 2. Choose the folder

Pick the folder R42J is in and allow the changes. The \`daten\` folder with your encrypted data appears next to it.

## 3. Create a profile

The assistant guides you through your password and recovery key. **Print the key and keep it away from the stick.** Without password and key nobody can reach your data.

## 4. Fill in your base data

Enter your data once or use an AI prompt to take it from an existing CV. Add at least one job focus.

## 5. First application

Add a new one under **Applications**, paste the job ad and create your CV and cover letter. The application then guides you through sending, step by step.

## Backups

R42J backs up automatically on the stick. Choose a second location in the settings so a broken stick costs you nothing.

## Read on

- [How to install an update](#/wissen/update-installieren)
- [What is an ATS?](#/wissen/ats-erklaert)
`);

  artikel("update-installieren", "Install an update", "Getting started", `
An update only replaces the program. Your data in the \`daten\` folder stays untouched.

## How to do it

1. Lock R42J and close the browser tab.
2. To be safe, back up the \`daten\` folder, for example by copying it to your computer.
3. Download the ZIP file \`r42j-vX.Y.Z.zip\` from the release and unpack it.
4. Delete the old \`app\` folder on the stick.
5. Copy the new \`app\` folder from the ZIP to the same place.
6. Start R42J as usual and unlock your profile.

You only need to replace the start files if the release note says so. \`daten\` is not in the ZIP and is never overwritten. Never delete this folder.

## Check for updates automatically

Turn the check on in the settings. R42J then asks GitHub for the latest version at most once a day when it starts. None of your data is transferred. The check is off by default.

## If something goes wrong

Put the old \`app\` folder back. New versions convert your vault the first time you open it and create a backup first. If a new version has already converted the vault, use that backup.
`);
})();
