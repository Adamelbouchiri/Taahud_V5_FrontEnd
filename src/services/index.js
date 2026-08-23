/* ============================================================
 *  SERVICES — public entry point
 *  ----------------------------------------------------------------
 *  Re-exports every service so pages can write a single import:
 *
 *      import { auth, projects, applications, contact } from '../services';
 *
 *  Source files:
 *    - http.js          configured axios instance
 *    - auth.js          login / register / OTP / forgot password
 *    - projects.js      CRUD on projects + file uploads
 *    - steps.js         project steps / milestones (define, submit, review, pay)
 *    - wallet.js        escrow wallet — provider withdrawals (halalas)
 *    - applications.js  applications on projects
 *    - partnerships.js  solidarity-arena partnership offers
 *    - partners.js      "Become a Partner" program (apply + validate)
 *    - contact.js       landing-page contact form
 *    - features.js      plan feature gating (quotas + access flags)
 *    - brokers.js       broker referral lookup + opportunities
 * ============================================================ */

export { auth } from './auth';
export { projects } from './projects';
export { steps } from './steps';
export { wallet } from './wallet';
export { applications } from './applications';
export { partnerships } from './partnerships';
export { partners } from './partners';
export { brokers } from './brokers';
export { contact } from './contact';
export { admin } from './admin';
export { subscriptions } from './subscriptions';
export { features } from './features';
export { default as http } from './http';
