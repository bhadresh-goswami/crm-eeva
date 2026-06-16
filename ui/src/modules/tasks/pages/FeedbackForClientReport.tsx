import ManagerReportPageBase from './ManagerReportPageBase'

const FeedbackForClientReport = () => (
  <ManagerReportPageBase
    title="Feedback For Client"
    subtitle="Client-ready interview feedback with scoring, improvement areas, and comments."
    endpoint="/manager/reports/feedback-for-client"
    showTitleCard
    columns={[
      { key: 'candidate', label: 'Candidate Name' },
      { key: 'status', label: 'Status' },
      { key: 'taskStartTime', label: 'Task Start Time' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'clientName', label: 'Client Name' },
      { key: 'expertName', label: 'Expert Name' },
      { key: 'communication', label: 'Communication' },
      { key: 'technical', label: 'Technical' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'projectExplanation', label: 'Project Explanation' },
      { key: 'overall', label: 'Overall' },
      { key: 'areaOfImprovements', label: 'Area of Improvements' },
      { key: 'comments', label: 'Comments' },
    ]}
  />
)

export default FeedbackForClientReport
