import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, message, Upload, Space } from 'antd';
import { ComplaintChartOutlined, UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

const ComplaintSubmission = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing/Payment Issue' },
    { value: 'account', label: 'Account Issue' },
    { value: 'compliance', label: 'Compliance Issue' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();

      if (data.success) {
        message.success('Complaint submitted successfully! We will review it soon.');
        form.resetFields();
        setFileList([]);
      } else {
        message.error(data.message || 'Failed to submit complaint');
      }
    } catch (error) {
      message.error('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: () => false, // Prevent automatic upload
    onChange: (info) => {
      setFileList(info.fileList);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="Submit a Complaint" icon={<ComplaintChartOutlined />}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: 'medium',
            category: 'technical'
          }}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Please enter complaint title' },
              { min: 5, message: 'Title must be at least 5 characters' }
            ]}
          >
            <Input
              placeholder="Brief description of your complaint"
              showCount
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select complaint category">
              {categories.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Priority"
            name="priority"
            rules={[{ required: true, message: 'Please select priority level' }]}
          >
            <Select placeholder="Select priority level">
              {priorities.map(pri => (
                <Option key={pri.value} value={pri.value}>
                  {pri.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              { required: true, message: 'Please provide detailed description' },
              { min: 20, message: 'Description must be at least 20 characters' }
            ]}
          >
            <TextArea
              rows={6}
              placeholder="Please provide detailed information about your complaint..."
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item label="Attachments (Optional)">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Upload Files</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                Submit Complaint
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setFileList([]);
                }}
                size="large"
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ComplaintSubmission;
