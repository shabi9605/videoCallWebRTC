from django.urls import path
from django.conf import settings
from . import views

urlpatterns = [
    path('',views.main_view,name='main_view'),
]