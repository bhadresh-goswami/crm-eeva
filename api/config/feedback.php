<?php

$additionalFields = [
    'area_of_improvements' => ['label' => 'Area of Improvements', 'type' => 'text', 'storage' => 'column'],
    'strengths' => ['label' => 'Strengths', 'type' => 'text', 'storage' => 'column'],
    'recommendations' => ['label' => 'Recommendations', 'type' => 'text', 'storage' => 'column'],
    'next_action' => ['label' => 'Next Action', 'type' => 'text', 'storage' => 'column'],
    'additional_feedback' => ['label' => 'Additional Feedback', 'type' => 'text', 'storage' => 'column'],
    'recording_url' => ['label' => 'Recording URL', 'type' => 'text', 'storage' => 'column'],
];

$rating = static fn (string $label, string $storage = 'column'): array => [
    'label' => $label,
    'type' => 'rating',
    'storage' => $storage,
    'required' => true,
    'min' => 1,
    'max' => 5,
];

$mockRating = static fn (string $label): array => $rating($label, 'custom');

return [
    'interview support' => [
        'name' => 'Interview Support',
        'fields' => [
            'company_name' => ['label' => 'Company Name', 'type' => 'text', 'storage' => 'column', 'required' => true],
            'interviewer_name' => ['label' => 'Interviewer Name', 'type' => 'text', 'storage' => 'column', 'required' => true],
            'interview_round' => ['label' => 'Interview Round', 'type' => 'text', 'storage' => 'column'],
            'communication' => $rating('Communication'),
            'technical' => $rating('Technical'),
            'confidence' => $rating('Confidence'),
            'project_explanation' => $rating('Project Explanation'),
            'read_proper' => ['label' => 'Read Proper', 'type' => 'text', 'storage' => 'column'],
        ] + $additionalFields,
        'overall_fields' => ['communication', 'technical', 'confidence', 'project_explanation'],
    ],
    'free counselling' => [
        'name' => 'Free Counselling',
        'fields' => [
            'communication' => $rating('Communication'),
            'career_clarity' => $rating('Career Clarity', 'custom'),
            'confidence' => $rating('Confidence'),
            'resume_readiness' => $rating('Resume Readiness', 'custom'),
            'career_goal_understanding' => $rating('Career Goal Understanding', 'custom'),
        ] + $additionalFields,
        'overall_fields' => ['communication', 'career_clarity', 'confidence', 'resume_readiness', 'career_goal_understanding'],
    ],
    'jdc' => [
        'name' => 'JDC',
        'fields' => [
            'jd_understanding' => $rating('JD Understanding', 'custom'),
            'role_alignment' => $rating('Role Alignment', 'custom'),
        ] + $additionalFields,
        'overall_fields' => ['jd_understanding', 'role_alignment'],
    ],
    'ruc' => [
        'name' => 'RUC',
        'fields' => [
            'resume_quality' => $rating('Resume Quality', 'custom'),
            'role_alignment' => $rating('Role Alignment', 'custom'),
        ] + $additionalFields,
        'overall_fields' => ['resume_quality', 'role_alignment'],
    ],
    'tac' => [
        'name' => 'TAC',
        'fields' => [
            'technical' => $rating('Technical'),
            'confidence' => $rating('Confidence'),
            'role_readiness' => $rating('Role Readiness', 'custom'),
        ] + $additionalFields,
        'overall_fields' => ['technical', 'confidence', 'role_readiness'],
    ],
    'training session' => [
        'name' => 'Training Session',
        'fields' => [
            'participation' => $rating('Participation', 'custom'),
            'assignment_completion' => $rating('Assignment Completion', 'custom'),
        ] + $additionalFields,
        'overall_fields' => ['participation', 'assignment_completion'],
    ],
    'mock' => [
        'name' => 'Mock',
        'fields' => [
            'overall_interview_readiness' => $mockRating('Overall Interview Readiness'),
            'confidence_level' => $mockRating('Confidence Level'),
            'communication' => $mockRating('Communication'),
            'professional_introduction' => $mockRating('Professional Introduction'),
            'resume_explanation' => $mockRating('Resume Explanation'),
            'technical_knowledge' => $mockRating('Technical Knowledge'),
            'problem_solving' => $mockRating('Problem Solving'),
            'behavioral_questions' => $mockRating('Behavioral Questions'),
            'situation_based_answers' => $mockRating('Situation Based Answers'),
            'system_design_architecture' => $mockRating('System Design / Architecture'),
            'coding_skills' => $mockRating('Coding Skills'),
            'debugging_approach' => $mockRating('Debugging Approach'),
            'time_management' => $mockRating('Time Management'),
            'listening_skills' => $mockRating('Listening Skills'),
            'english_fluency' => $mockRating('English Fluency'),
            'body_language' => $mockRating('Body Language'),
            'professionalism' => $mockRating('Professionalism'),
            'overall_recommendation' => ['label' => 'Overall Recommendation', 'type' => 'select', 'storage' => 'custom', 'required' => true, 'options' => ['Ready for Interview', 'Needs Practice', 'Needs More Preparation', 'Not Ready']],
            'strengths' => ['label' => 'Strengths', 'type' => 'textarea', 'storage' => 'column'],
            'weaknesses' => ['label' => 'Weaknesses', 'type' => 'textarea', 'storage' => 'custom'],
            'improvement_suggestions' => ['label' => 'Improvement Suggestions', 'type' => 'textarea', 'storage' => 'custom'],
            'recommended_topics' => ['label' => 'Recommended Topics', 'type' => 'multiselect', 'storage' => 'custom', 'options' => ['Communication', 'Java', 'React', 'AWS', 'SQL', 'Behavioral', 'System Design', 'Leadership', 'Problem Solving', 'Confidence Building', 'Mock Practice']],
            'overall_expert_notes' => ['label' => 'Overall Expert Notes', 'type' => 'textarea', 'storage' => 'custom'],
            'candidate_action_plan' => ['label' => 'Candidate Action Plan', 'type' => 'textarea', 'storage' => 'custom'],
        ],
        'overall_fields' => ['overall_interview_readiness', 'confidence_level', 'communication', 'professional_introduction', 'resume_explanation', 'technical_knowledge', 'problem_solving', 'behavioral_questions', 'situation_based_answers', 'system_design_architecture', 'coding_skills', 'debugging_approach', 'time_management', 'listening_skills', 'english_fluency', 'body_language', 'professionalism'],
    ],
];
