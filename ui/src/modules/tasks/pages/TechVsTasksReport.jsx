import ManagerReportPageBase from './ManagerReportPageBase'

const TechVsTasksReport = () => (
  <ManagerReportPageBase
    title="Tech Vs Tasks"
    columns={[
      { key: 'taskId', label: 'Task ID' },
      { key: 'technicalExpert', label: 'Technical Expert' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'clientCompany', label: 'Client Company' },
      { key: 'taskType', label: 'Task Type' },
      { key: 'date', label: 'Date' },
      { key: 'estTime', label: 'EST Time' },
      { key: 'status', label: 'Status' },
      { key: 'averageScore', label: 'Average Score' },
      { key: 'action', label: 'Action' },
    ]}
  />
)

export default TechVsTasksReport
