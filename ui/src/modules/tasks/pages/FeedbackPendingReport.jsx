import ManagerReportPageBase from './ManagerReportPageBase'

const FeedbackPendingReport = () => (
  <ManagerReportPageBase
    title="Feedback Pending Report"
    subtitle="Track tasks where detailed feedback is pending from technical experts."
    endpoint="/manager/reports/feedback-pending"
    columns={[
      { key: 'taskId', label: 'Task ID' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'clientCompany', label: 'Client Company' },
      { key: 'taskType', label: 'Task Type' },
      { key: 'technicalExpert', label: 'Technical Expert' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'estTime', label: 'EST Time' },
      { key: 'duration', label: 'Duration' },
      { key: 'action', label: 'Action' },
    ]}
  />
)

export default FeedbackPendingReport
