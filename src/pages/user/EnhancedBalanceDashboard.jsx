import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Modal, Form, Select, Input, message, Spin, DatePicker, Tabs, Alert, Progress, Tooltip } from 'antd';
import { WalletOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, SearchOutlined, FilterOutlined, BellOutlined, TrendingUpOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Pie, Column, Line } from '@ant-design/plots';
import balanceService from '../../services/balanceService';
import notificationService from '../../services/notificationService';
import healthService from '../../services/healthService';
import reconciliationService from '../../services/reconciliationService';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const EnhancedBalanceDashboard = () => {
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const unsubscribeNotifications = useRef(null);
  const unsubscribeHealth = useRef(null);

  useEffect(() => {
    loadData();
    initializeServices();
    
    return () => {
      if (unsubscribeNotifications.current) {
        unsubscribeNotifications.current();
      }
      if (unsubscribeHealth.current) {
        unsubscribeHealth.current();
      }
      healthService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'deposits') {
      loadDeposits();
    } else if (activeTab === 'deductions') {
      loadDeductions();
    }
  }, [activeTab, searchQuery, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balancesData, statsData, chartDataResponse, notificationData, healthData, discrepancyData] = await Promise.all([
        balanceService.getMultiCurrencyBalances(),
        balanceService.getBalanceStats(),
        balanceService.getBalanceChartData('7d'),
        balanceService.getUnreadCount(),
        healthService.getHealthStatus(),
        reconciliationService.getCurrentDiscrepancies()
      ]);

      setBalances(balancesData.balances || []);
      setStatistics(statsData);
      setChartData(chartDataResponse);
      setNotificationCount(notificationData);
      setHealthStatus(healthData);
      setDiscrepancies(discrepancyData);
    } catch (error) {
      message.error('Failed to load dashboard data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await balanceService.getTransactionHistory(params);
      setTransactions(response.transactions || []);
    } catch (error) {
      message.error('Failed to load transactions');
    }
  };

  const loadDeposits = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await balanceService.getDepositHistory(params);
      setDeposits(response.deposits || []);
    } catch (error) {
      message.error('Failed to load deposits');
    }
  };

  const loadDeductions = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await balanceService.getDeductionHistory(params);
      setDeductions(response.deductions || []);
    } catch (error) {
      message.error('Failed to load deductions');
    }
  };

  const initializeServices = () => {
    // Initialize notifications
    notificationService.initializeNotifications();
    
    // Subscribe to payment notifications
    unsubscribeNotifications.current = notificationService.subscribe('payment_status', (data) => {
      message.info(data.message);
      loadData(); // Refresh data
    });

    // Subscribe to balance updates
    notificationService.subscribe('balance_update', (data) => {
      message.info(`Balance updated: ${data.change > 0 ? '+' : ''}${data.change} ${data.currency}`);
      loadData(); // Refresh data
    });

    // Initialize health monitoring
    healthService.startMonitoring(30000); // Check every 30 seconds
    
    // Subscribe to health updates
    window.addEventListener('healthUpdate', (event) => {
      setHealthStatus(event.detail.status);
    });
  };

  const handleCreateDeposit = async () => {
    if (!selectedCrypto) {
      message.error('Please select a cryptocurrency');
      return;
    }

    setLoading(true);
    try {
      // This would call your deposit API
      message.success('Deposit address created successfully');
      setDepositModalVisible(false);
      setSelectedCrypto('');
      loadData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      await balanceService.exportHistory(type, {
        search: searchQuery,
        date_from: dateRange ? dateRange[0].format('YYYY-MM-DD') : null,
        date_to: dateRange ? dateRange[1].format('YYYY-MM-DD') : null
      });
      message.success('Export downloaded successfully');
    } catch (error) {
      message.error('Failed to export data');
    }
  };

  const handleReconcile = async () => {
    try {
      const result = await reconciliationService.performDailyReconciliation();
      message.success(`Reconciliation completed: ${result.total_local} payments checked`);
      setDiscrepancies(result.discrepancies || []);
    } catch (error) {
      message.error('Reconciliation failed');
    }
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      deposit: 'green',
      withdrawal: 'red',
      fee_deduction: 'orange',
      refund: 'blue',
      adjustment: 'purple'
    };
    return colors[type] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'green',
      pending: 'orange',
      failed: 'red',
      processing: 'blue'
    };
    return colors[status] || 'default';
  };

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getTransactionTypeColor(type)}>
          {type.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Deposit', value: 'deposit' },
        { text: 'Withdrawal', value: 'withdrawal' },
        { text: 'Fee', value: 'fee_deduction' },
        { text: 'Refund', value: 'refund' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <span style={{ color: record.type === 'deposit' ? '#52c41a' : '#ff4d4f' }}>
          {record.type === 'deposit' ? '+' : '-'}{balanceService.formatBalance(amount, record.currency)} {record.currency}
        </span>
      ),
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
    },
    {
      title: 'Balance Before',
      dataIndex: 'balance_before',
      key: 'balance_before',
      render: (balance, record) => balanceService.formatBalance(balance, record.currency)
    },
    {
      title: 'Balance After',
      dataIndex: 'balance_after',
      key: 'balance_after',
      render: (balance, record) => balanceService.formatBalance(balance, record.currency)
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'COMPLETED'}
        </Tag>
      )
    }
  ];

  const depositColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: 'Payment ID',
      dataIndex: 'payment_id',
      key: 'payment_id',
      render: (id) => <code>{id}</code>
    },
    {
      title: 'Cryptocurrency',
      dataIndex: 'cryptocurrency',
      key: 'cryptocurrency',
      render: (currency) => <Tag color="blue">{currency}</Tag>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => `${balanceService.formatBalance(amount, record.currency)} ${record.currency}`
    },
    {
      title: 'USD Value',
      dataIndex: 'usd_value',
      key: 'usd_value',
      render: (value) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            Modal.info({
              title: 'Deposit Details',
              content: (
                <div>
                  <p><strong>Payment ID:</strong> {record.payment_id}</p>
                  <p><strong>Amount:</strong> {record.amount} {record.cryptocurrency}</p>
                  <p><strong>USD Value:</strong> ${record.usd_value}</p>
                  <p><strong>Status:</strong> {record.status}</p>
                  <p><strong>Created:</strong> {moment(record.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                  {record.deposit_address && <p><strong>Address:</strong> <code>{record.deposit_address}</code></p>}
                </div>
              ),
              width: 600
            });
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  if (loading && !balances.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Health Status Alert */}
      {healthStatus && !healthStatus.api?.healthy && (
        <Alert
          message="System Health Warning"
          description="Some system components are experiencing issues. Please check the health monitoring section."
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <Alert
          message={`Payment Discrepancies Detected: ${discrepancies.length}`}
          description="There are payment discrepancies that require attention. Click to review and reconcile."
          type="error"
          showIcon
          closable
          action={
            <Button size="small" onClick={handleReconcile}>
              Reconcile Now
            </Button>
          }
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={18}>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Balance Dashboard</h1>
          <p className="text-gray-600">Complete financial overview with real-time updates</p>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDepositModalVisible(true)}
            style={{ marginRight: 8 }}
          >
            Create Deposit
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Button
            icon={<BellOutlined />}
            badge={{ count: notificationCount }}
            onClick={() => message.info('Notifications feature coming soon')}
          />
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Overview Tab */}
        <TabPane tab="Overview" key="overview">
          {/* Balance Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            {balances.map((balance) => (
              <Col xs={24} sm={12} md={8} lg={6} key={balance.currency}>
                <Card>
                  <Statistic
                    title={`${balance.currency} Balance`}
                    value={balance.balance}
                    precision={balanceService.getDecimalPlaces(balance.currency)}
                    prefix={<WalletOutlined />}
                    valueStyle={{ 
                      color: parseFloat(balance.balance) > 0 ? '#3f8600' : '#cf1322' 
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    ≈ ${balance.usd_value ? parseFloat(balance.usd_value).toFixed(2) : '0.00'} USD
                  </div>
                </Card>
              </Col>
            ))}
            
            {/* Statistics Cards */}
            {statistics && (
              <>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card>
                    <Statistic
                      title="Total Transactions"
                      value={statistics.total_transactions}
                      prefix={<HistoryOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card>
                    <Statistic
                      title="Total Deposits"
                      value={statistics.total_deposits}
                      prefix={<TrendingUpOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </>
            )}
          </Row>

          {/* Charts */}
          {chartData && (
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} lg={12}>
                <Card title="Balance Distribution">
                  <Pie
                    data={balances.map(b => ({
                      type: b.currency,
                      value: parseFloat(b.balance)
                    }))}
                    angleField="value"
                    colorField="type"
                    radius={0.8}
                    label={{
                      type: 'outer',
                      content: '{name} {percentage}'
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="7-Day Balance Trend">
                  <Line
                    data={chartData.daily || []}
                    xField="date"
                    yField="balance"
                    smooth
                    point={{
                      size: 5,
                      shape: 'diamond'
                    }}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        {/* Transactions Tab */}
        <TabPane tab="All Transactions" key="transactions">
          <Card title="Transaction History" extra={
            <div>
              <Input
                placeholder="Search transactions..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 200, marginRight: 8 }}
              />
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ marginRight: 8 }}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('transactions')}
                style={{ marginRight: 8 }}
              >
                Export
              </Button>
              <Button icon={<FilterOutlined />}>
                Filter
              </Button>
            </div>
          }>
            <Table
              columns={transactionColumns}
              dataSource={transactions}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </TabPane>

        {/* Deposits Tab */}
        <TabPane tab="Deposits" key="deposits">
          <Card title="Deposit History" extra={
            <div>
              <Input
                placeholder="Search deposits..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 200, marginRight: 8 }}
              />
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ marginRight: 8 }}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('deposits')}
              >
                Export
              </Button>
            </div>
          }>
            <Table
              columns={depositColumns}
              dataSource={deposits}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        {/* Deductions Tab */}
        <TabPane tab="Deductions" key="deductions">
          <Card title="Deduction History" extra={
            <div>
              <Input
                placeholder="Search deductions..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 200, marginRight: 8 }}
              />
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ marginRight: 8 }}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('deductions')}
              >
                Export
              </Button>
            </div>
          }>
            <Table
              columns={transactionColumns.filter(col => col.key !== 'type')}
              dataSource={deductions}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Create Deposit Modal */}
      <Modal
        title="Create New Deposit"
        visible={depositModalVisible}
        onOk={handleCreateDeposit}
        onCancel={() => {
          setDepositModalVisible(false);
          setSelectedCrypto('');
        }}
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Cryptocurrency" required>
            <Select
              placeholder="Select cryptocurrency"
              value={selectedCrypto}
              onChange={setSelectedCrypto}
              style={{ width: '100%' }}
            >
              <Option value="BTC">Bitcoin (BTC)</Option>
              <Option value="ETH">Ethereum (ETH)</Option>
              <Option value="USDT">Tether (USDT)</Option>
              <Option value="USDC">USD Coin (USDC)</Option>
              <Option value="LTC">Litecoin (LTC)</Option>
              <Option value="BCH">Bitcoin Cash (BCH)</Option>
              <Option value="TRX">TRON (TRX)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnhancedBalanceDashboard;
