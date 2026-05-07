import ManagerReportPageBase from './ManagerReportPageBase'

const TasksSummaryReport = () => (
  <ManagerReportPageBase
    title="Tasks Summary"
    subtitle="Comprehensive operational summary of all assigned tasks."
    endpoint="/manager/reports/tasks-summary"
    columns={[
      { key: 'taskId', label: 'Task ID' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'clientCompany', label: 'Client Company' },
      { key: 'taskType', label: 'Task Type' },
      { key: 'technicalExpert', label: 'Technical Expert' },
      { key: 'status', label: 'Status' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'estTime', label: 'EST Time' },
      { key: 'averageScore', label: 'Average Score' },
      { key: 'action', label: 'Action' },
    ]}
  />
)

export default TasksSummaryReport
