import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Checkbox, Space, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';

const { Option } = Select;

const SubAccountManagement = () => {
  const [subAccounts, setSubAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [permissionsAccount, setPermissionsAccount] = useState(null);
  const [form] = Form.useForm();
  const [permissionsForm] = Form.useForm();

  const availablePermissions = [
    { key: 'view_messages', label: 'View Messages', description: 'Can view sent and received messages' },
    { key: 'send_messages', label: 'Send Messages', description: 'Can create and send new messages' },
    { key: 'view_balance', label: 'View Balance', description: 'Can view account balance and transactions' },
    { key: 'view_reports', label: 'View Reports', description: 'Can view basic reports and statistics' },
    { key: 'manage_contacts', label: 'Manage Contacts', description: 'Can manage contact list and beneficiaries' },
    { key: 'view_compliance', label: 'View Compliance', description: 'Can view compliance and audit information' }
  ];

  useEffect(() => {
    fetchSubAccounts();
  }, []);

  const fetchSubAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sub-accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSubAccounts(data.subAccounts);
      }
    } catch (error) {
      message.error('Failed to fetch sub-accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (values) => {
    setLoading(true);
    try {
      const url = editingAccount 
        ? `/api/sub-accounts/${editingAccount.id}`
        : '/api/sub-accounts/create';
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success(editingAccount ? 'Sub-account updated successfully' : 'Sub-account created successfully');
        setModalVisible(false);
        setEditingAccount(null);
        form.resetFields();
        fetchSubAccounts();
      } else {
        message.error(data.message || 'Failed to save sub-account');
      }
    } catch (error) {
      message.error('Failed to save sub-account');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    form.setFieldsValue(account);
    setModalVisible(true);
  };

  const handleDelete = async (accountId) => {
    try {
      const response = await fetch(`/api/sub-accounts/${accountId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        message.success('Sub-account deactivated successfully');
        fetchSubAccounts();
      } else {
        message.error(data.message || 'Failed to deactivate sub-account');
      }
    } catch (error) {
      message.error('Failed to deactivate sub-account');
    }
  };

  const handlePermissions = async (account) => {
    setPermissionsAccount(account);
    permissionsForm.setFieldsValue({
      permissions: account.permissions || []
    });
    setPermissionsModalVisible(true);
  };

  const handleUpdatePermissions = async (values) => {
    try {
      const response = await fetch(`/api/sub-accounts/${permissionsAccount.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success('Permissions updated successfully');
        setPermissionsModalVisible(false);
        fetchSubAccounts();
      } else {
        message.error(data.message || 'Failed to update permissions');
      }
    } catch (error) {
      message.error('Failed to update permissions');
    }
  };

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <span>{email}</span>
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.first_name} ${record.last_name}`
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color="blue">{role}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => {
        const permissions = record.permissions || [];
        return (
          <div>
            {permissions.slice(0, 2).map(perm => (
              <Tag key={perm} size="small" style={{ margin: '2px' }}>
                {perm.replace('_', ' ')}
              </Tag>
            ))}
            {permissions.length > 2 && (
              <Tag size="small">+{permissions.length - 2} more</Tag>
            )}
          </div>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            onClick={() => handlePermissions(record)}
          >
            Permissions
          </Button>
          <Popconfirm
            title="Are you sure you want to deactivate this sub-account?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Deactivate
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Sub-Account Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAccount(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Create Sub-Account
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={subAccounts}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingAccount ? 'Edit Sub-Account' : 'Create Sub-Account'}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAccount(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrUpdate}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            label="First Name"
            name="firstName"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          {!editingAccount && (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select placeholder="Select role">
              <Option value="sub_user">Sub User</Option>
              <Option value="viewer">Viewer</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingAccount ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingAccount(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        title={`Manage Permissions - ${permissionsAccount?.email}`}
        visible={permissionsModalVisible}
        onCancel={() => {
          setPermissionsModalVisible(false);
          setPermissionsAccount(null);
          permissionsForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={permissionsForm}
          layout="vertical"
          onFinish={handleUpdatePermissions}
        >
          <Form.Item label="Permissions" name="permissions">
            <Checkbox.Group>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {availablePermissions.map(permission => (
                  <div key={permission.key} style={{ marginBottom: '8px' }}>
                    <Checkbox value={permission.key}>
                      <div>
                        <strong>{permission.label}</strong>
                        <br />
                        <small style={{ color: '#666' }}>{permission.description}</small>
                      </div>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update Permissions
              </Button>
              <Button onClick={() => {
                setPermissionsModalVisible(false);
                setPermissionsAccount(null);
                permissionsForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubAccountManagement;
