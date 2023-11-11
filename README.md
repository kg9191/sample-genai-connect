# Generative AI

1. Create Bedrock model
2. add bedrock permissions to cognito role

- Navigate to identity pool
- User access
- Edit authnticated user Role
- {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "bedrock:InvokeModel",
            "Resource": "*"
        }
    ]
}

