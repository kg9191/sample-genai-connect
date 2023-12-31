# Generative AI using AWS Bedrock and Amazon Connect 

### Overview of solution

This solution uses Amazon Bedrock to run prompts provided by agent or customer on Amazon Connect Chats. Agents can use the solution to assist in their day to day duties.

#### AWS Services Used

- [Amazon Connect](https://aws.amazon.com/connect/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon Cognito](https://aws.amazon.com/cognito/)
- [Amazon Amplify](https://aws.amazon.com/amplify/)

#### Configuration Steps

1. [Install and Configure AWS Amplify](https://docs.amplify.aws/start/getting-started/installation/q/integration/react/#install-the-amplify-cli)
2. [Enable Bedrock model](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html). You can use `anthropic.claude-instant-v1` model.
3. git clone https://github.com/teleme-coder/sample-genai-connect.git or download zip file.
4. cd sample-genai-connect.git
4. run `npm install`
5. run `amplify init`. You can use a different environment.
> ? Do you want to use an existing environment? No

> ? Enter a name for the environment test

> ? Select the authentication method you want to use: AWS profile

7. run `amplify push`.
8. Update Amazon Cognito Authenticated Permissions to include `bedrock:InvokeModel`.

    - Navigate to Amazon Cognito Identity pool: https://us-east-1.console.aws.amazon.com/cognito/v2/identity/identity-pools?region=us-east-1
    - Choose the newly created user pool
    - Select `User Access tab > Edit Role -> View IAM role`
    - Add the following permissions to role:
  
      ```
        "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "bedrock:InvokeModel",
            "Resource": "*"
        }]
   
      ```

9. run `amplify publish`. This will create a url to access you web application.
10. [Add web application domain to Amazon Connect](https://docs.aws.amazon.com/connect/latest/adminguide/app-integration.html)



##### Application Snapshots

![Config](config.png)

