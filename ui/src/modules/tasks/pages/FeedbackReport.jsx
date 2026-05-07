import ManagerReportPageBase from './ManagerReportPageBase'

const FeedbackReport = () => (
  <ManagerReportPageBase
    title="Feedback Report"
    subtitle="Completed feedback analysis and expert evaluation insights."
    endpoint="/manager/reports/feedback-report"
    columns={[
      { key: 'taskId', label: 'Task ID' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'technicalExpert', label: 'Technical Expert' },
      { key: 'assignedBy', label: 'Assigned By' },
      { key: 'clientCompany', label: 'Client Company' },
      { key: 'taskType', label: 'Task Type' },
      { key: 'feedbackSubmittedDate', label: 'Feedback Submitted Date' },
      { key: 'averageScore', label: 'Average Score' },
      { key: 'action', label: 'Action' },
    ]}
  />
)

export default FeedbackReport
