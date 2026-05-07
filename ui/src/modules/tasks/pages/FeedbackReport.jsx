import ManagerReportPageBase from './ManagerReportPageBase'

const FeedbackReport = () => (
  <ManagerReportPageBase
    title="Feedback Report"
    endpoint="/manager/reports/feedback-report"
    columns={[
      { key: 'taskId', label: 'Task ID' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'technicalExpert', label: 'Technical Expert' },
      { key: 'clientCompany', label: 'Client Company' },
      { key: 'taskType', label: 'Task Type' },
      { key: 'feedbackSubmittedDate', label: 'Feedback Submitted Date' },
      { key: 'averageScore', label: 'Average Score' },
      { key: 'action', label: 'Action' },
    ]}
  />
)

export default FeedbackReport
