from django.urls import path
from .views import TaskListCreateView, TaskDetailView, DashboardView

urlpatterns = [
    path('<int:project_pk>/tasks/', TaskListCreateView.as_view(), name='task-list'),
    path('<int:project_pk>/tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('<int:project_pk>/dashboard/', DashboardView.as_view(), name='dashboard'),
]
