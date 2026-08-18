import { Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';

export function HomePage() {
  const { selectedLearnerProfileId } = useApp();

  if (!selectedLearnerProfileId) {
    return <Navigate replace to="/profiles" />;
  }

  return (
    <section className="page hero">
      <div>
        <p className="eyebrow">今日复习</p>
        <h1>把学过的内容，真正记住。</h1>
        <p className="lead">
          应用骨架和离线数据库已经就位。内容同步完成后，这里会显示到期、学习中和新卡片数量。
        </p>
      </div>
      <div className="metric-grid" aria-label="复习概览">
        <article><strong>0</strong><span>到期</span></article>
        <article><strong>0</strong><span>学习中</span></article>
        <article><strong>10</strong><span>新卡上限</span></article>
      </div>
    </section>
  );
}
