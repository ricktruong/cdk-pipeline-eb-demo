import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * CLOUD DEVELOPMENT
 */
export interface EBEnvProps extends cdk.StackProps {
    // Autoscaling group configuration
  minSize?: string;
  maxSize?: string;
  instanceTypes?: string;
  envName?: string;
}

export class EBApplnStack extends cdk.Stack {
   constructor(scope: Construct, id: string, props?: EBEnvProps) {
       super(scope, id, props);
    
    /**
     * A. Upload the App to S3 Automatically
     */
    // Construct an S3 asset Zip from directory up
    const webAppZipArchive = new s3assets.Asset(this, 'WebAppZip', {
        path: `${__dirname}/../src`,
    });

    // * Whenever we update the application source code and push it to the Github repo, the file will automatically get updated in S3

    /**
     * B. Add the Elastic Beanstalk CDK Dependencies
     * I. Create the Elastic Beanstalk Application
     */
    const appName = 'MyWebApp';
    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
        applicationName: appName,
    });

    // * An Elastic Beanstalk application is a logical collection of ELastic Beanstalk components, like a folder
  
    /**
    * II. Create Elastic Beanstalk Application version
     */
    const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
        applicationName: appName,
        sourceBundle: {
            s3Bucket: webAppZipArchive.s3BucketName,
            s3Key: webAppZipArchive.s3ObjectKey,
        },
    });

    // POINT OF FAILURE - Make sure that Elastic Beanstalk app exists before creating an app version
    appVersionProps.addDependency(app);

    /**
     * C. Create the Instance Profile
     * An instance profile is a container for an AWS IAM role that we can use to pass role information to an Amazon EC2 instance when the instance starts
     */
    // Create role and instance profile
    const myRole = new iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const managedPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier');
    myRole.addManagedPolicy(managedPolicy);

    const myProfileName = `${appName}-InstanceProfile`;

    const instanceProfile = new iam.CfnInstanceProfile(this, myProfileName, {
        instanceProfileName: myProfileName,
        roles: [
            myRole.roleName
        ]
    });

    /**
     * D. Create Elastic Beanstalk Environment
     * An Elastic Beanstalk environment is a collection of AWS resources running an application version
     */
    const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
        {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'IamInstanceProfile',
            value: myProfileName,
        },
        {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MinSize',
            value: props?.maxSize ?? '1',
        },
        {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MaxSize',
            value: props?.maxSize ?? '1',
        },
        {
            namespace: 'aws:ec2:instances',
            optionName: 'InstanceTypes',
            value: props?.instanceTypes ?? 't2.micro',
        },
    ];

    const elbEnv = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
        environmentName: props?.envName ?? 'MyWebAppEnvironment',
        applicationName: app.applicationName || appName,
        solutionStackName: '64bit Amazon Linux 2 v5.8.0 running Node.js 18',
        optionSettings: optionSettingProperties,
        versionLabel: appVersionProps.ref,
    });
  }
}
