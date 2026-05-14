import http from './http';

/* ============================================================
 *  APPLICATIONS SERVICE
 *  ----------------------------------------------------------------
 *  Two actors interact with the `applications` table, so the
 *  service is grouped by who's doing the action:
 *
 *    applications.applicant.*  → service provider / supplier
 *                                acting on their OWN application
 *    applications.owner.*      → project owner (customer)
 *                                acting on applications they RECEIVED
 *
 *  This avoids the confusion of `withdraw` vs `reject` — they're
 *  both "remove an application" but by different people for
 *  different reasons.
 *
 *  Migration shape (matches `applications` table):
 *    id, user_id, project_id,
 *    cover_letter (text),
 *    bid_amount (integer),
 *    delevery_date (string),
 *    status (default 'pending'),
 *    is_accepted (default false),
 *    timestamps.
 * ============================================================ */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));


export const applications = {

  /* ============================================================
   *  APPLICANT — actions a service provider takes on
   *  applications they themselves submitted.
   * ============================================================ */
  applicant: {
    /**
     * Submit a new application to a project.
     * POST /api/projects/:projectId/apply
     *
     * Server: creates a row with user_id=auth, status='pending',
     *         is_accepted=false.
     *
     * @param {number} projectId
     * @param {{ cover_letter, bid_amount, delevery_date }} payload
     */
    async submit(projectId, payload) {
      // return http.post(`/projects/${projectId}/apply`, payload);

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(700);
      const created = {
        id: MOCK_APPLICATIONS.length + 100,
        user_id: 1,
        project_id: projectId,
        ...payload,
        status: 'pending',
        is_accepted: false,
        created_at: new Date().toISOString(),
      };
      MOCK_APPLICATIONS.unshift(created);
      return created;
    },

    /**
     * List MY applications (the ones I submitted).
     * GET /api/me/applications
     */
    async listMine() {
      // return http.get('/me/applications');

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(450);
      return MOCK_APPLICATIONS;
    },

    /**
     * Cancel my own pending application.
     * DELETE /api/applications/:id
     *
     * Server: deletes the row (or sets status='withdrawn',
     * depending on your backend choice).
     */
    async cancelMine(applicationId) {
      // return http.delete(`/applications/${applicationId}`);

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(400);
    },
  },


  /* ============================================================
   *  OWNER — actions the project owner (customer) takes on
   *  applications they received on their project.
   * ============================================================ */
  owner: {
    /**
     * List applications received on a project I own.
     * GET /api/projects/:projectId/applications
     */
    async listForProject(projectId) {
      // return http.get(`/projects/${projectId}/applications`);

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(400);
      return MOCK_RECEIVED_APPLICATIONS.filter(
        (a) => a.project_id === Number(projectId)
      );
    },

    /**
     * Accept an application — choose this applicant as my partner.
     * POST /api/applications/:id/accept
     *
     * Server should also:
     *   - set application.status = 'accepted', is_accepted = true
     *   - set project.partner_id = applicant.user_id
     *   - set project.is_accepted = true
     *   - set project.status = 'in_progress'
     *   - set all OTHER applications on this project to 'rejected'
     */
    async acceptApplication(applicationId) {
      // return http.post(`/applications/${applicationId}/accept`);

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(500);
      const target = MOCK_RECEIVED_APPLICATIONS.find((a) => a.id === Number(applicationId));
      if (!target) return;
      target.status = 'accepted';
      target.is_accepted = true;
      // Reject siblings
      for (const a of MOCK_RECEIVED_APPLICATIONS) {
        if (a.project_id === target.project_id && a.id !== target.id) {
          a.status = 'rejected';
          a.is_accepted = false;
        }
      }
    },

    /**
     * Reject an application — turn down this applicant.
     * POST /api/applications/:id/reject
     *
     * Server: sets application.status = 'rejected'. Doesn't delete
     * the row so the applicant can still see they were rejected.
     */
    async rejectApplication(applicationId) {
      // return http.post(`/applications/${applicationId}/reject`);

      /* ── MOCK ── remove when backend is ready ───────────────── */
      await delay(500);
      const target = MOCK_RECEIVED_APPLICATIONS.find((a) => a.id === Number(applicationId));
      if (target) {
        target.status = 'rejected';
        target.is_accepted = false;
      }
    },
  },
};


/* ============================================================
 *  MOCK DATA
 *  Delete this section once the backend is live.
 *
 *  Two mock arrays:
 *    - MOCK_APPLICATIONS         applications submitted BY user 1
 *                                (used by applicant.listMine)
 *    - MOCK_RECEIVED_APPLICATIONS applications received on projects
 *                                OWNED BY user 1 (used by owner.listForProject)
 * ============================================================ */

const MOCK_APPLICATIONS = [
  {
    id: 1,
    user_id: 1,
    project_id: 102,
    cover_letter:
      'لدينا خبرة واسعة في تشطيب المباني التجارية، أنجزنا أكثر من ١٢ مشروعاً مماثلاً في جدّة خلال العامين الماضيين. نلتزم بالمواعيد ونوفّر شهادات الجودة لكلّ مرحلة.',
    bid_amount: 620000,
    delevery_date: '2026-09-15',
    status: 'pending',
    is_accepted: false,
    created_at: '2026-04-26T10:00:00',
    project: {
      id: 102,
      name: 'تشطيب مكاتب إدارية - برج تجاري',
      type: 'تشطيب',
      city: 'جدّة',
      budget: 650000,
      status: 'open',
      owner: { id: 21, name: 'شركة المسار العقاري' },
    },
  },
  {
    id: 2,
    user_id: 1,
    project_id: 105,
    cover_letter:
      'فريقنا متخصص في التجديد السكني، يمكننا إنجاز التشطيبات بجودة عالية خلال المدة المطلوبة.',
    bid_amount: 72000,
    delevery_date: '2026-07-05',
    status: 'accepted',
    is_accepted: true,
    created_at: '2026-04-15T14:00:00',
    project: {
      id: 105,
      name: 'تجديد مطبخ وحمامات',
      type: 'ترميم وتجديد',
      city: 'مكة المكرمة',
      budget: 75000,
      status: 'in_progress',
      owner: { id: 24, name: 'منى السلمي' },
    },
  },
  {
    id: 3,
    user_id: 1,
    project_id: 103,
    cover_letter:
      'نقدّم خدمات صيانة دورية لأكثر من ٣٠ منشأة تجارية. سجلنا حافل بالاستمرارية والاعتماد.',
    bid_amount: 240000,
    delevery_date: '2027-04-30',
    status: 'rejected',
    is_accepted: false,
    created_at: '2026-04-10T09:30:00',
    project: {
      id: 103,
      name: 'صيانة شاملة لمستودع',
      type: 'صيانة دورية',
      city: 'الدمام',
      budget: 220000,
      status: 'open',
      owner: { id: 22, name: 'مستودعات الشرق' },
    },
  },
];

const MOCK_RECEIVED_APPLICATIONS = [
  // Applications received on project #1 (تجديد فيلا في حي النخيل)
  {
    id: 101,
    user_id: 30,
    project_id: 1,
    cover_letter:
      'مؤسّسة الإتقان للمقاولات، خبرة ١٢ عاماً في الترميم. أنجزنا مشاريع مماثلة في الرياض ضمن نفس النطاق السعري.',
    bid_amount: 235000,
    delevery_date: '2026-09-30',
    status: 'pending',
    is_accepted: false,
    created_at: '2026-04-23T11:00:00',
    applicant: {
      id: 30,
      name: 'مؤسّسة الإتقان للمقاولات',
      account_type: 'entrepreneur',
      specialty: 'مقاولات عامة',
      city: 'الرياض',
    },
  },
  {
    id: 102,
    user_id: 31,
    project_id: 1,
    cover_letter:
      'فريق متكامل من النجارين والكهربائيين والسبّاكين، يمكننا تنفيذ التشطيبات الداخلية والخارجية بالتوازي.',
    bid_amount: 248000,
    delevery_date: '2026-10-15',
    status: 'pending',
    is_accepted: false,
    created_at: '2026-04-24T15:30:00',
    applicant: {
      id: 31,
      name: 'مكتب البناء الحديث',
      account_type: 'entrepreneur',
      specialty: 'تشطيب',
      city: 'الرياض',
    },
  },
  {
    id: 103,
    user_id: 32,
    project_id: 1,
    cover_letter:
      'نختصّ بالتجديد الفاخر، نوفّر مواد عالية الجودة وضمان كامل لمدة سنتين.',
    bid_amount: 265000,
    delevery_date: '2026-09-15',
    status: 'pending',
    is_accepted: false,
    created_at: '2026-04-25T10:00:00',
    applicant: {
      id: 32,
      name: 'مكتب الإبداع للتصميم',
      account_type: 'engineering',
      specialty: 'تصميم وإشراف',
      city: 'الرياض',
    },
  },
  // Applications on project #2 (مجمع سكني في الشرقية)
  {
    id: 104,
    user_id: 33,
    project_id: 2,
    cover_letter:
      'شركة الإنشاءات الكبرى، خبرة في المشاريع السكنية الكبيرة. أنجزنا ٣ مجمعات مماثلة خلال السنوات الخمس الماضية.',
    bid_amount: 8200000,
    delevery_date: '2027-12-30',
    status: 'pending',
    is_accepted: false,
    created_at: '2026-04-19T09:00:00',
    applicant: {
      id: 33,
      name: 'شركة الإنشاءات الكبرى',
      account_type: 'entrepreneur',
      specialty: 'مقاولات عامة',
      city: 'الدمام',
    },
  },
  // An accepted application on project #3 (already in_progress)
  {
    id: 105,
    user_id: 4,
    project_id: 3,
    cover_letter: 'فريقنا جاهز لإنجاز التشطيبات الثلاث ضمن الجدول الزمني المحدد.',
    bid_amount: 470000,
    delevery_date: '2026-07-30',
    status: 'accepted',
    is_accepted: true,
    created_at: '2026-02-12T10:00:00',
    applicant: {
      id: 4,
      name: 'شركة الإنشاءات الحديثة',
      account_type: 'entrepreneur',
      specialty: 'تشطيب',
      city: 'جدّة',
    },
  },
];
