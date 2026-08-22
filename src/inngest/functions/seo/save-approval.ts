import { inngest } from '../../client';
import { saveApproval } from '../../../lib/db/approvals';

export const saveApprovalFn = inngest.createFunction(
  { id: 'seo-save-approval', retries: 2, triggers: [{ event: 'seo/save-approval' }] },
  async ({ event }: any) => {
    const { jobId, storeId, status, reviewerNotes, editedPayload } = event.data;
    return saveApproval({ jobId, storeId, status, reviewerNotes, editedPayload });
  }
);
